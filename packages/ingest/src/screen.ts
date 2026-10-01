import { type AgentCall, type Args, requireArg } from './agentApi';
import { utcNow } from './ingestion/format';
import type { ResultData } from './ingestion/types';

/**
 * A result screen as piu-spy sends it (the legacy `splitResults`): up to two sides, left
 * and right, each with the result and possibly the personal / machine best shown next to
 * it. Only the results are stored: the bests aren't plays made now.
 */

const SIDES = ['left', 'right'] as const;
const PASS_GRADES = ['S', 'SS', 'SSS'];

const RESULT_FIELDS = [
  'recognition_notes',
  'score_increase',
  'grade',
  'is_pass',
  'plate',
  'rank_mode',
  'mods_list',
  'misses',
  'bads',
  'goods',
  'greats',
  'perfects',
  'max_combo',
  'calories',
];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// 'YYYY-MM-DD HH:MM:SS', the only format piu-spy sends
const parseGained = (value: unknown): string => {
  const match = String(value).match(/^(\d{4})-(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{1,2}):(\d{1,2})$/);
  const [year, month, day, hours, minutes, seconds] = (match ?? []).slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
  if (!match || date.getUTCDate() !== day || hours > 23 || minutes > 59 || seconds > 59) {
    throw new Error(`time data '${value}' does not match format '%Y-%m-%d %H:%M:%S'`);
  }
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

const toFlag = (value: unknown) => (typeof value === 'boolean' ? Number(value) : value);

/** The results of a screen, as rows to validate and store */
export const splitResults = ({ args, agent }: AgentCall): ResultData[] => {
  const header = {
    screen_file: `${agent.name}/${requireArg(args, 'screen_file')}`,
    mix_name: String(requireArg(args, 'mix_name')),
    track_name: String(requireArg(args, 'track_name')),
    gained: parseGained(requireArg(args, 'gained')),
    added: utcNow(),
    agent: agent.id,
  };

  const results: ResultData[] = [];
  for (const sideName of SIDES) {
    const side = args[sideName];
    if (side === undefined) {
      continue;
    }
    if (!isObject(side)) {
      throw new Error(`Invalid '${sideName}'`);
    }
    const chartLabel = String(requireArg(side, 'chart_label'));

    if (!isObject(side.result)) {
      continue;
    }
    const source: Args = side.result;
    const playerName = requireArg(source, 'player_name');
    const score = requireArg<number | null>(source, 'score');
    if (score == null) {
      continue;
    }

    const fields = Object.fromEntries(
      RESULT_FIELDS.filter((field) => source[field] != null).map((field) => [
        field,
        toFlag(source[field]),
      ])
    ) as Partial<ResultData>;
    const data: ResultData = {
      recognition_notes: '',
      ...fields,
      ...header,
      chart_label: chartLabel,
      player_name: String(playerName),
      score,
      grade: fields.grade ?? '?',
      rank_mode: fields.rank_mode ?? 0,
      exact_gain_date: 1,
    };
    // XX's grades say whether the chart was passed
    if (data.mix_name === 'XX' && data.is_pass === undefined && data.grade && data.grade !== '?') {
      data.is_pass = Number(data.grade.includes('+') || PASS_GRADES.includes(data.grade));
    }
    results.push(data);
  }
  return results;
};
