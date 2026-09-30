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
