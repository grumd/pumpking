import { DiscardedResult, UnrecognizedResult } from './errors';
import { formatNumber } from './format';
import { getResultMods } from './mods';
import { getResultStats, toJudgements } from './stats';
import type { ChartInstance, ResultData } from './types';
import { COMBO_GRADES, minScoreForStats } from '@pumpking/utils/grades';
import { getRankMode } from '@pumpking/utils/mods';

/**
 * Validation for the combo-scoring mixes before Phoenix, i.e. XX (the legacy
 * `scoring_combo.py`). The score can't be recomputed there, only checked against a
 * minimum. Returns the result's rank mode (0 / 1), which comes from its mods.
 */

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
    if (score < minScoreForStats(toJudgements(steps), chart.level)) {
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
