import { DiscardedResult, UnrecognizedResult } from './errors';
import { formatNumber, pyStr } from './format';
import { validateMods } from './mods';
import { getResultStats, totalSteps, type StepStats } from './stats';
import type { ResultData } from './types';

/**
 * Validation for the million-scoring mixes, Phoenix and later (the legacy
 * `scoring_mln.py`). The score, grade and plate all follow from the stats, so they are
 * recomputed and compared.
 */

// The lowest score for each grade, best first
const GRADES: Record<string, [number, string][]> = {
  Phoenix: [
    [995_000, 'SSS+'],
    [990_000, 'SSS'],
    [985_000, 'SS+'],
    [980_000, 'SS'],
    [975_000, 'S+'],
    [970_000, 'S'],
    [960_000, 'AAA+'],
    [950_000, 'AAA'],
    [925_000, 'AA+'],
    [900_000, 'AA'],
    [825_000, 'A+'],
    [750_000, 'A'],
    [650_000, 'B'],
    [550_000, 'C'],
    [450_000, 'D'],
    [0, 'F'],
  ],
  Phoenix2: [
    [995_000, 'SSS+'],
    [990_000, 'SSS'],
    [985_000, 'SS+'],
    [980_000, 'SS'],
    [975_000, 'S+'],
    [970_000, 'S'],
    [960_000, 'AAA+'],
    [950_000, 'AAA'],
    [940_000, 'AA+'],
    [920_000, 'AA'],
    [900_000, 'A+'],
    [800_000, 'A'],
    [700_000, 'B'],
    [600_000, 'C'],
    [500_000, 'D'],
    [0, 'F'],
  ],
};

const calcGrade = (mixName: string, score: number) => {
  const grades = GRADES[mixName];
  if (!grades) {
    throw new Error(`No grades table for mix ${mixName}`);
  }
  return grades.find(([minScore]) => score >= minScore)?.[1];
};

export const calcPlate = (steps: StepStats, isPass: boolean | null): string | null => {
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

// The arcade's formula, without the rounding down:
// ⌊(0.995 × (Perfect + 0.6 × Great + 0.2 × Good + 0.1 × Bad) + 0.005 × Max Combo) / Total Notes × 1,000,000⌋
const calcFloatScore = (steps: StepStats, maxCombo: number) =>
  (995 * (1000 * steps.perfects + 600 * steps.greats + 200 * steps.goods + 100 * steps.bads) +
    5000 * maxCombo) /
  totalSteps(steps);

/**
 * The phoenix score of a pre-Phoenix result, from its stats (null without them). Rounds
 * up, as the legacy ingestion always did
 */
export const calcPhoenixScoreFromStats = (data: ResultData): number | null => {
  const { steps, maxCombo } = getResultStats(data);
  return steps && maxCombo != null ? Math.ceil(calcFloatScore(steps, maxCombo)) : null;
};

export const validateMillionStats = (data: ResultData) => {
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

  const calculatedScore = calcFloatScore(steps, maxCombo);
  if (Math.abs(score - calculatedScore) > 1) {
    throw new UnrecognizedResult(
      `Invalid score ${formatNumber(score)} for specified stats, should be ~ ${formatNumber(
        Math.trunc(calculatedScore)
      )}`
    );
  }

  const calculatedGrade = calcGrade(data.mix_name, score);
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
  validateMods(data, { millionScoring: true });
};
