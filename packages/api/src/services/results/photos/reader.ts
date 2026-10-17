import createDebug from 'debug';
import OpenAI from 'openai';
import type { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';
import { error } from 'utils';

/**
 * Reads a photo of a result screen with a vision model on OpenRouter (see
 * docs/photo-results/PLAN.md). Each reader is from another vendor, so the next one doesn't
 * repeat the first one's mistake
 */

const debug = createDebug('backend-ts:service:photos:reader');

export interface Reader {
  model: string;
  // OpenRouter's reasoning options: Gemini's reasoning can't be turned off
  reasoning: { effort: 'minimal' } | { enabled: false };
}

export const READER_A: Reader = {
  model: 'google/gemini-3.5-flash-lite',
  reasoning: { effort: 'minimal' },
};

export const READER_B: Reader = {
  model: 'anthropic/claude-haiku-5.5',
  reasoning: { enabled: false },
};

// XX only, when A and B don't both pass and agree: breaks the tie
export const READER_C: Reader = {
  model: 'openai/gpt-6-luna',
  reasoning: { enabled: false },
};

/** What a reader saw on the photo */
export interface PhotoRead {
  song_title: string | null;
  chart_type: 'S' | 'D' | 'COOP' | null;
  level: number | null;
  perfect: number;
  great: number;
  good: number;
  bad: number;
  miss: number;
  max_combo: number;
  score: number;
  grade: string;
  // XX only: the grade letter is grey and cracked. Phoenix tells a fail by its missing plate
  stage_failed?: boolean;
  mod_badges: string[];
  // Phoenix and later only: the text under the grade, null when there is none
  plate_text?: string | null;
}

// The mixes with arcade track names, which the song title is matched against
export const PHOTO_MIXES = ['XX', 'Phoenix', 'Phoenix2'] as const;
export type PhotoMix = (typeof PHOTO_MIXES)[number];

export interface ReadResult {
  // null when the answer wasn't valid JSON
  read: PhotoRead | null;
  // USD, as OpenRouter charged it
  cost: number;
}

export interface PhotoImage {
  mimeType: string;
  data: Buffer;
}

export type ReadPhoto = (reader: Reader, image: PhotoImage, mix: PhotoMix) => Promise<ReadResult>;

// One prompt per mix, so a small model only reads about the screen in front of it

const TITLE_RULES =
  'Copy it as shown, including suffixes like "- FULL SONG" or "- SHORT CUT". Never use the artist, the big background text or the badges. null only if there is no song name in the photo.';

const CHART_LINE =
  '- chart_type and level: from the round difficulty badge only (SINGLE = S, DOUBLE = D, plus the number in it). Not the stage number and not the player\'s title such as "EXPERT LV.1".';

// The numbers column is often a whole row off its labels, and pairing by row then shifts
// every value: it is read from the calories up
const XX_PROMPT = `This is a photo of a Pump It Up XX result screen. Read it exactly, digit by digit.
- song_title: the small text directly above the PERFECT row. The line above it may be the arcade's location name, never use that. ${TITLE_RULES}
${CHART_LINE}
- perfect, great, good, bad, miss, max_combo: the numbers on the right form one column of 8. Find the calories first: the only number with a decimal point, at the bottom of the column. Counting up from it, the numbers are: total score, max combo, miss, bad, good, great, perfect. So the topmost number is perfect, even when it sits level with the song title. Ignore which label a number is beside: the column is often a whole row off its labels. The counters have leading zeroes; the calories are never used
- score: the total score as an integer, without separators
- grade: the big grade letter in the middle: F, D, C, B, A, S, SS or SSS
- stage_failed: true if the stage was failed: the grade letter has no color, it is grey or silver-white, usually with thin dark cracks across it that can be hard to see. A silver-white letter is a failed stage even when you see no cracks. A passed grade letter is colored, e.g. a blue A or B, a gold S
- mod_badges: every small square badge along the side of the result panel, as written (e.g. "AV 620", "BGA DARK", "HJ", "VJ")`;

// Phoenix and Phoenix 2 screens look alike; each prompt names only its own mix
const phoenixPrompt = (
  mixName: string
) => `This is a photo of a Pump It Up ${mixName} result screen. Read it exactly, digit by digit.
- song_title: the song name in the banner near the top. ${TITLE_RULES}
${CHART_LINE}
- perfect, great, good, bad, miss, max_combo: the counters on the same rows as their labels (they have leading zeroes; the number column can be left or right of the labels and sit slightly above or below them)
- score: the big SCORE number as an integer, without separators, not the smaller "+N" below it
- grade: the big grade in the middle, e.g. F, D, C, B, A, AA+, AAA, AAA+, S, SS+, SSS+
- plate_text: the text written under the big grade, e.g. "MARVELOUS GAME" or "PERFECT GAME". null if there is no such text (a failed stage has none)
- mod_badges: every small square badge along the side of the result panel, as written (e.g. "AV 620", "HJ", "RANK")`;

const PROMPTS: Record<PhotoMix, string> = {
  XX: XX_PROMPT,
  Phoenix: phoenixPrompt('Phoenix'),
  Phoenix2: phoenixPrompt('Phoenix 2'),
};

const integer = { type: 'integer' };

const schema = (mix: PhotoMix) => {
  const properties: Record<string, object> = {
    song_title: { type: ['string', 'null'] },
    // Anthropic rejects an enum on a type list such as ['string', 'null']
    chart_type: { anyOf: [{ type: 'string', enum: ['S', 'D', 'COOP'] }, { type: 'null' }] },
    level: { type: ['integer', 'null'] },
    perfect: integer,
    great: integer,
    good: integer,
    bad: integer,
    miss: integer,
    max_combo: integer,
    score: integer,
    grade: { type: 'string' },
    ...(mix === 'XX'
      ? { stage_failed: { type: 'boolean' } }
      : { plate_text: { type: ['string', 'null'] } }),
    mod_badges: { type: 'array', items: { type: 'string' } },
  };
  return {
    type: 'object',
    additionalProperties: false,
    required: Object.keys(properties),
    properties,
  };
};

// The request parameters that OpenRouter adds to OpenAI's
interface OpenRouterParams {
  reasoning: Reader['reasoning'];
  provider: { require_parameters: boolean; data_collection: 'deny' | 'allow' };
  usage: { include: boolean };
}

let client: OpenAI | null = null;

const getClient = () => {
  if (!process.env.OPENROUTER_API_KEY) {
    throw error(500, 'OpenRouter API key is not configured');
  }
  // One call hung for 5 minutes during the tests: a timeout and one retry
  client ??= new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    timeout: 30_000,
    maxRetries: 1,
  });
  return client;
};

export const readPhoto: ReadPhoto = async (reader, image, mix) => {
  const params: ChatCompletionCreateParamsNonStreaming & OpenRouterParams = {
    model: reader.model,
    reasoning: reader.reasoning,
    provider: { require_parameters: true, data_collection: 'deny' },
    usage: { include: true },
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'result_screen', strict: true, schema: schema(mix) },
    },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: PROMPTS[mix] },
          {
            type: 'image_url',
            image_url: {
              url: `data:${image.mimeType};base64,${image.data.toString('base64')}`,
              detail: 'high',
            },
          },
        ],
      },
    ],
  };

  const response = await getClient().chat.completions.create(params);
  // OpenRouter adds the cost in USD to the usage
  const cost = (response.usage as { cost?: number } | undefined)?.cost ?? 0;
  const content = response.choices[0]?.message.content;
  debug('%s read the photo for $%d: %s', reader.model, cost, content);
  try {
    return { read: JSON.parse(content ?? '') as PhotoRead, cost };
  } catch {
    return { read: null, cost };
  }
};
