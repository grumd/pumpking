import type { ResultApiOutput } from 'features/leaderboards/hooks/useChartsQuery';

export const Mixes = {
  24: 'Prime',
  25: 'Prime2',
  26: 'XX',
  27: 'Phoenix',
} as const;

export type MixNumbers = keyof typeof Mixes;
export type Mixes = (typeof Mixes)[MixNumbers];

export const isMixNumber = (mix: number): mix is MixNumbers => {
  return mix in Mixes;
};

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

export const getPhoenixGrade = (score: number | null): GradePhoenix | null => {
  if (score == null) return null;
  switch (true) {
    case score >= 995_000:
      return GradePhoenix.SSSP;
    case score >= 990_000:
      return GradePhoenix.SSS;
    case score >= 985_000:
      return GradePhoenix.SSP;
    case score >= 980_000:
      return GradePhoenix.SS;
    case score >= 975_000:
      return GradePhoenix.SP;
    case score >= 970_000:
      return GradePhoenix.S;
    case score >= 960_000:
      return GradePhoenix.AAAP;
    case score >= 950_000:
      return GradePhoenix.AAA;
    case score >= 925_000:
      return GradePhoenix.AAP;
    case score >= 900_000:
      return GradePhoenix.AA;
    case score >= 825_000:
      return GradePhoenix.AP;
    case score >= 750_000:
      return GradePhoenix.A;
    case score >= 650_000:
      return GradePhoenix.B;
    case score >= 550_000:
      return GradePhoenix.C;
    case score >= 450_000:
      return GradePhoenix.D;
    default:
      return GradePhoenix.F;
  }
};

export const getPhoenixPlate = (result: ResultApiOutput): PlatePhoenix | null => {
  const [perfect, great, good, bad, miss] = result.stats;
  if (perfect == null || great == null || good == null || bad == null || miss == null) return null;

  switch (true) {
    case miss > 20:
      return PlatePhoenix.R;
    case miss > 10:
      return PlatePhoenix.F;
    case miss > 5:
      return PlatePhoenix.T;
    case miss > 0:
      return PlatePhoenix.M;
    case bad > 0:
      return PlatePhoenix.S;
    case good > 0:
      return PlatePhoenix.E;
    case great > 0:
      return PlatePhoenix.U;
    case perfect > 0:
      return PlatePhoenix.P;
    default:
      return null;
  }
};
