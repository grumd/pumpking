import { DiscardedResult, UnrecognizedResult } from './errors';
import { formatNumber, pyStr } from './format';
import { getResultMods } from './mods';
import { getResultStats, type StepStats } from './stats';
import type { ResultData } from './types';
import { getPhoenixGrade } from '@pumpking/utils/grades';
import { getUnroundedPhoenixScore } from '@pumpking/utils/phoenixScore';

/**
 * Validation for the million-scoring mixes, Phoenix and later (the legacy
 * `scoring_mln.py`). The score, grade and plate all follow from the stats, so they are
 * recomputed and compared.
 */

const calcPlate = (steps: StepStats, isPass: boolean | null): string | null => {
  const { misses, bads, goods, greats } = steps;
  if (isPass === false) {
    return null;
  }
  if (misses + bads + goods + greats === 0) {
    return 'PG';
  }
  if (misses + bads + goods === 0) {
    return 'UG';
  }
  if (misses + bads === 0) {
    return 'EG';
  }
  if (misses === 0) {
    return 'SG';
  }
  if (misses <= 5) {
    return 'MG';
  }
  if (misses <= 10) {
    return 'TG';
  }
  if (misses <= 20) {
    return 'FG';
  }
  return 'RG';
};

const unroundedScore = (steps: StepStats, maxCombo: number) =>
  getUnroundedPhoenixScore({
    perfect: steps.perfects,
    great: steps.greats,
    good: steps.goods,
    bad: steps.bads,
    miss: steps.misses,
    combo: maxCombo,
  });

/**
 * The phoenix score of a pre-Phoenix result, from its stats (null without them). Rounds
 * up, as the legacy ingestion always did
 */
export const calcPhoenixScoreFromStats = (data: ResultData): number | null => {
  const { steps, maxCombo } = getResultStats(data);
  return steps && maxCombo != null ? Math.ceil(unroundedScore(steps, maxCombo)) : null;
};

export const validateMillionStats = (mixId: number, data: ResultData) => {
  const { score, scoreIncrease, maxCombo, steps, grade, isPass, plate } = getResultStats(data);

  if (score === 0) {
    throw new DiscardedResult('Empty score, not needed');
  }
  // Without the max combo the score can't be checked (the legacy code failed on it)
  if (!steps || maxCombo == null) {
    throw new UnrecognizedResult('Result with no stats');
  }

  const { perfects, greats } = steps;
  if ((plate === 'UG' || plate === 'PG') && maxCombo !== perfects + greats) {
    throw new UnrecognizedResult(
      `Invalid max_combo ${maxCombo} for plate ${plate} with ${perfects} perfects and ${greats} greats`
    );
  }
  if (maxCombo > perfects + greats) {
    throw new UnrecognizedResult(
      `Invalid max_combo ${maxCombo} with ${perfects} perfects and ${greats} greats`
    );
  }

  const calculatedScore = unroundedScore(steps, maxCombo);
  if (Math.abs(score - calculatedScore) > 1) {
    throw new UnrecognizedResult(
      `Invalid score ${formatNumber(score)} for specified stats, should be ~ ${formatNumber(
        Math.trunc(calculatedScore)
      )}`
    );
  }

  const calculatedGrade = getPhoenixGrade(score, mixId);
  if (grade !== calculatedGrade) {
    throw new UnrecognizedResult(
      `Invalid grade '${grade}' for specified stats, should be '${calculatedGrade}'`
    );
  }

  if (isPass == null) {
    throw new UnrecognizedResult('Pass status is unknown');
  }

  const calculatedPlate = calcPlate(steps, isPass);
  if (plate !== calculatedPlate) {
    throw new UnrecognizedResult(
      `Invalid plate '${pyStr(plate)}' for specified stats, should be '${pyStr(calculatedPlate)}'`
    );
  }

  if (scoreIncrease != null) {
    if (!isPass) {
      throw new UnrecognizedResult(
        `Score increase ${scoreIncrease} should not be shown for result without pass`
      );
    }
    if (scoreIncrease > score) {
      throw new UnrecognizedResult(
        `Invalid score_increase: ${formatNumber(scoreIncrease)} > score ${formatNumber(score)}`
      );
    }
  }

  if ((plate !== null) !== isPass) {
    throw new UnrecognizedResult(
      `Plate '${pyStr(calculatedPlate)}' should be shown for result with pass and vice versa`
    );
  }

  // Checked last, as in the legacy code. Rank mode on these mixes comes from piu-spy,
  // not from the mods
  getResultMods(data, { millionScoring: true });
};
