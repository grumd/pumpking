import createDebug from 'debug';
import fs from 'fs';
import OpenAI from 'openai';
import { error } from 'utils';

const debug = createDebug('backend-ts:service:recognizeScore');

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

export interface RecognizeScoreResult {
  numbers: number[];
  promptTokens: number;
  completionTokens: number;
}

export const recognizeScore = async (imagePath: string): Promise<RecognizeScoreResult> => {
  if (!process.env.OPENAI_API_KEY || !openai) {
    throw error(500, 'OpenAI API key is not configured');
  }

  // Read the image file and convert to base64
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');

  // Detect mime type from file header
  const mimeType = detectMimeType(imageBuffer);

  debug('Sending image to OpenAI for score recognition, size: %d bytes', imageBuffer.length);

  const response = await openai.chat.completions.create({
    model: 'gpt-5-mini',
    reasoning_effort: 'minimal',
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'score_numbers_array',
        description: 'An array of 8 numbers extracted from the game result screen',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['numbers'],
          properties: {
            numbers: {
              type: 'array',
              items: { type: 'number' },
              minItems: 8,
              maxItems: 8,
            },
          },
        },
      },
    },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Extract the vertically lined up white numbers from the photo according to the schema provided. One number per line, some numbers may have leading zeroes. All zeroes have a dot in the middle.`,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
              detail: 'high',
            },
          },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  debug('OpenAI response: %s', JSON.stringify(response));

  if (!content) {
    throw error(500, 'No response from OpenAI');
  }

  const promptTokens = response.usage?.prompt_tokens ?? 0;
  const completionTokens = response.usage?.completion_tokens ?? 0;

  try {
    const parsed = JSON.parse(content) as { numbers: number[] };

    if (!Array.isArray(parsed.numbers) || parsed.numbers.length !== 8) {
      throw new Error('Invalid response format: expected 8 numbers');
    }

    return {
      numbers: parsed.numbers,
      promptTokens,
      completionTokens,
    };
  } catch (e) {
    debug('Failed to parse OpenAI response: %s', e);
    throw error(
      500,
      `Failed to parse score recognition result: ${
        e instanceof Error ? e.message : 'Unknown error'
      }`
    );
  }
};

const detectMimeType = (buffer: Buffer): string => {
  // Check magic bytes for common image formats
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'image/gif';
  }
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return 'image/webp';
  }
  // Default to jpeg
  return 'image/jpeg';
};
