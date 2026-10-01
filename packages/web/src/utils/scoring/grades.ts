import {
  GradePhoenix,
  PlatePhoenix,
  getPhoenixGrade as getMillionScoringGrade,
} from '@pumpking/utils/grades';

export const Mixes = {
  24: 'Prime',
  25: 'Prime2',
  26: 'XX',
  27: 'Phoenix',
  28: 'Phoenix2',
} as const;

export type MixNumbers = keyof typeof Mixes;
export type Mixes = (typeof Mixes)[MixNumbers];

export const isMixNumber = (mix: number): mix is MixNumbers => {
  return mix in Mixes;
};

export { GradePhoenix, PlatePhoenix };

/**
 * Phoenix 2 (mix 28) grade formula - the latest one, applied to all mixes.
 * The original per-result grade is only shown in the result details popup.
 */
export const getPhoenixGrade = (score?: number | null): GradePhoenix | null =>
  score == null ? null : getMillionScoringGrade(score);
