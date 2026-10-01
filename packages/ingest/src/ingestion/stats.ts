import { UnrecognizedResult } from './errors';
import type { ResultData } from './types';

type StatField =
  | 'score_increase'
  | 'misses'
  | 'bads'
  | 'goods'
  | 'greats'
  | 'perfects'
  | 'max_combo';

// Anything with stats: a result as sent or as stored
export type WithStats = Partial<Record<StatField, unknown>>;

// piu-spy sends JSON, so a stat may arrive as something other than a whole number
const getStat = (data: WithStats, field: StatField): number | null => {
  const value = data[field];
  if (value === undefined || value === null) {
    return null;
  }
  if (!Number.isInteger(value)) {
    throw new UnrecognizedResult(`'${field}' is of type '${typeof value}'`);
  }
  return value as number;
};

export interface StepStats {
  perfects: number;
  greats: number;
  goods: number;
  bads: number;
  misses: number;
}

/** All five judgements, or null when any of them is unknown */
export const getStepStats = (data: WithStats): StepStats | null => {
  const perfects = getStat(data, 'perfects');
  const greats = getStat(data, 'greats');
  const goods = getStat(data, 'goods');
  const bads = getStat(data, 'bads');
  const misses = getStat(data, 'misses');
  return perfects != null && greats != null && goods != null && bads != null && misses != null
    ? { perfects, greats, goods, bads, misses }
    : null;
};

export const totalSteps = (steps: StepStats) =>
  steps.perfects + steps.greats + steps.goods + steps.bads + steps.misses;

/** A result's stats, checked to be whole numbers (legacy `ResultStats`) */
export const getResultStats = (data: ResultData) => {
  const score = Number(data.score);
  if (!Number.isInteger(score)) {
    throw new UnrecognizedResult(`Invalid score '${data.score}'`);
  }
  // Checked in this order, so a result with several wrong stats fails on the same one
  const steps = getStepStats(data);
  return {
    score,
    scoreIncrease: getStat(data, 'score_increase'),
    maxCombo: getStat(data, 'max_combo'),
    steps,
    grade: (data.grade ?? '?').toUpperCase(),
    isPass: data.is_pass == null ? null : Boolean(data.is_pass),
    plate: data.plate ?? null,
  };
};
