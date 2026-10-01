import { MIXES } from './mixes';

export const GradePhoenix = {
  SSSP: 'SSS+',
  SSS: 'SSS',
  SSP: 'SS+',
  SS: 'SS',
  SP: 'S+',
  S: 'S',
  AAAP: 'AAA+',
  AAA: 'AAA',
  AAP: 'AA+',
  AA: 'AA',
  AP: 'A+',
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  F: 'F',
} as const;

export type GradePhoenix = (typeof GradePhoenix)[keyof typeof GradePhoenix];

export const PlatePhoenix = {
  R: 'R',
  F: 'F',
  T: 'T',
  M: 'M',
  S: 'S',
  E: 'E',
  U: 'U',
  P: 'P',
} as const;

export type PlatePhoenix = (typeof PlatePhoenix)[keyof typeof PlatePhoenix];

export const phoenixGradeOrder = [
  GradePhoenix.SSSP,
  GradePhoenix.SSS,
  GradePhoenix.SSP,
  GradePhoenix.SS,
  GradePhoenix.SP,
  GradePhoenix.S,
  GradePhoenix.AAAP,
  GradePhoenix.AAA,
  GradePhoenix.AAP,
  GradePhoenix.AA,
  GradePhoenix.AP,
  GradePhoenix.A,
  GradePhoenix.B,
  GradePhoenix.C,
  GradePhoenix.D,
  GradePhoenix.F,
];

// The lowest score of each grade, best first. Phoenix 2 moved the thresholds below AAA
const PHOENIX_GRADE_THRESHOLDS: Record<number, [number, GradePhoenix][]> = {
  [MIXES.Phoenix]: [
    [995_000, GradePhoenix.SSSP],
    [990_000, GradePhoenix.SSS],
    [985_000, GradePhoenix.SSP],
    [980_000, GradePhoenix.SS],
    [975_000, GradePhoenix.SP],
    [970_000, GradePhoenix.S],
    [960_000, GradePhoenix.AAAP],
    [950_000, GradePhoenix.AAA],
    [925_000, GradePhoenix.AAP],
    [900_000, GradePhoenix.AA],
    [825_000, GradePhoenix.AP],
    [750_000, GradePhoenix.A],
    [650_000, GradePhoenix.B],
    [550_000, GradePhoenix.C],
    [450_000, GradePhoenix.D],
    [0, GradePhoenix.F],
  ],
  [MIXES.Phoenix2]: [
    [995_000, GradePhoenix.SSSP],
    [990_000, GradePhoenix.SSS],
    [985_000, GradePhoenix.SSP],
    [980_000, GradePhoenix.SS],
    [975_000, GradePhoenix.SP],
    [970_000, GradePhoenix.S],
    [960_000, GradePhoenix.AAAP],
    [950_000, GradePhoenix.AAA],
    [940_000, GradePhoenix.AAP],
    [920_000, GradePhoenix.AA],
    [900_000, GradePhoenix.AP],
    [800_000, GradePhoenix.A],
    [700_000, GradePhoenix.B],
    [600_000, GradePhoenix.C],
    [500_000, GradePhoenix.D],
    [0, GradePhoenix.F],
  ],
};

/** The grade of a phoenix score on a million-scoring mix (Phoenix 2 by default) */
export const getPhoenixGrade = (score: number, mixId: number = MIXES.Phoenix2): GradePhoenix => {
  const thresholds = PHOENIX_GRADE_THRESHOLDS[mixId];
  if (!thresholds) {
    throw new Error(`No grades for mix ${mixId}`);
  }
  return thresholds.find(([minScore]) => score >= minScore)![1];
};
