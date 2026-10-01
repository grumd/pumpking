import { DiscardedResult, UnrecognizedResult } from './errors';
import { formatNumber } from './format';
import { getResultMods } from './mods';
import { getResultStats, type StepStats } from './stats';
import type { ChartInstance, ResultData } from './types';
import { getRankMode } from '@pumpking/utils/mods';

/**
 * Validation for the combo-scoring mixes before Phoenix, i.e. XX (the legacy
 * `scoring_combo.py`). The score can't be recomputed there, only checked against a
 * minimum. Returns the result's rank mode (0 / 1), which comes from its mods.
 */

const COMBO_GRADES = [
  '?',
  'F',
  'F+',
  'D',
  'D+',
  'C',
  'C+',
  'B',
  'B+',
  'A',
  'A+',
  'S',
  'S-',
  'SS',
  'SSS',
];

// Scores were higher on harder charts
const levelMultiplier = (level: number | null) => (level == null || level <= 10 ? 1 : level / 10);

// Grade bonuses are left out, so this is a lower bound
const minScoreForStats = (steps: StepStats, level: number | null) =>
  ((steps.perfects * 1000 +
    steps.greats * 500 +
    steps.goods * 100 -
    steps.bads * 200 -
    steps.misses * 500) *
    levelMultiplier(level)) /
  2;

export const validateComboStats = (chart: ChartInstance, data: ResultData): number => {
  const mods = getResultMods(data, { millionScoring: false });
  // Before Phoenix, rank mode is the VJ mod
  const rankMode = mods ? getRankMode(mods, chart) : false;

  const { score, scoreIncrease, maxCombo, steps, grade } = getResultStats(data);

  if (score === 0) {
    throw new DiscardedResult('Empty score, not needed');
  }
  if (score % 100 !== 0) {
    throw new UnrecognizedResult(`Invalid score: ${formatNumber(score)} is not a multiple of 100`);
  }
  if (!COMBO_GRADES.includes(grade)) {
    throw new UnrecognizedResult(`Invalid grade '${grade}'`);
  }

  if (steps) {
    if (score < minScoreForStats(steps, chart.level)) {
      throw new UnrecognizedResult(
        `Invalid score: ${formatNumber(score)} is too low for stats specified`
      );
    }
    if (maxCombo != null) {
      const { perfects, greats } = steps;
      if ((grade === 'SS' || grade === 'SSS') && maxCombo !== perfects + greats) {
        throw new UnrecognizedResult(
          `Invalid max_combo: ${maxCombo} [grade ${grade}] != ${perfects} perfects and ${greats} greats`
        );
      }
      if (maxCombo > perfects + greats) {
        throw new UnrecognizedResult(
          `Invalid max_combo ${maxCombo} with ${perfects} perfects and ${greats} greats`
        );
      }
    }
  }

  if (scoreIncrease != null) {
    if (scoreIncrease % 100 !== 0) {
      throw new UnrecognizedResult(
        `Invalid score_increase: ${formatNumber(scoreIncrease)} is not a multiple of 100`
      );
    }
    if (scoreIncrease > score) {
      throw new UnrecognizedResult(
        `Invalid score_increase: ${formatNumber(scoreIncrease)} > score ${formatNumber(score)}`
      );
    }
  }

  return Number(rankMode);
};
