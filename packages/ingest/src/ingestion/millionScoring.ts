import { DiscardedResult, UnrecognizedResult } from './errors';
import { formatNumber, pyStr } from './format';
import { getResultMods } from './mods';
import { getResultStats, toJudgements } from './stats';
import type { CheckOptions, ResultData } from './types';
import { calcPlate, getPhoenixGrade } from '@pumpking/utils/grades';
import { getPhoenixScore, getUnroundedPhoenixScore } from '@pumpking/utils/phoenixScore';

/**
 * Validation for the million-scoring mixes, Phoenix and later (the legacy
 * `scoring_mln.py`). The score, grade and plate all follow from the stats, so they are
 * recomputed and compared.
 */

/**
 * The phoenix score of a pre-Phoenix result, from its stats (null without them). Rounds
 * up, as the legacy ingestion always did
 */
export const calcPhoenixScoreFromStats = (data: ResultData): number | null => {
  const { steps, maxCombo } = getResultStats(data);
  return steps && maxCombo != null
    ? Math.ceil(getUnroundedPhoenixScore({ ...toJudgements(steps), combo: maxCombo }))
    : null;
};

export const validateMillionStats = (
  mixId: number,
  data: ResultData,
  { skipScoreCheck }: CheckOptions = {}
) => {
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

  // The legacy code allowed the score to be one off. The arcade's score is exact, but
  // computed in floating point (see getPhoenixScore). The reason keeps the legacy wording
  const calculatedScore = getPhoenixScore({ ...toJudgements(steps), combo: maxCombo }, mixId);
  if (!skipScoreCheck && score !== calculatedScore) {
    throw new UnrecognizedResult(
      `Invalid score ${formatNumber(score)} for specified stats, should be ~ ${formatNumber(
        calculatedScore
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

  // A pass always has a plate and a fail never has one, so this also checks that (the
  // legacy code checked it again later, which could never fail)
  const calculatedPlate = calcPlate(toJudgements(steps), isPass);
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

  // Checked last, as in the legacy code. Rank mode on these mixes comes from piu-spy,
  // not from the mods
  getResultMods(data, { millionScoring: true });
};
