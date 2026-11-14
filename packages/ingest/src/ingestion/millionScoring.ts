import { DiscardedResult, UnrecognizedResult } from './errors';
import { formatNumber, pyStr } from './format';
import { getResultMods } from './mods';
import { getResultStats, toJudgements } from './stats';
import type { CheckOptions, ResultData } from './types';
import { calcPlate, getPhoenixGrade } from '@pumpking/utils/grades';
import { getPhoenixScore, getUnroundedPhoenixScore } from '@pumpking/utils/phoenixScore';

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

  getResultMods(data, { millionScoring: true });
};
