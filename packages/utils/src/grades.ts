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

/** The five judgements of a result */
export interface Judgements {
  perfect: number;
  great: number;
  good: number;
  bad: number;
  miss: number;
}

/** The plates as results store them, with the text the arcade shows under the grade */
export const PLATE_NAMES = {
  PG: 'PERFECT GAME',
  UG: 'ULTIMATE GAME',
  EG: 'EXTREME GAME',
  SG: 'SUPERB GAME',
  MG: 'MARVELOUS GAME',
  TG: 'TALENTED GAME',
  FG: 'FAIR GAME',
  RG: 'ROUGH GAME',
} as const;

export type Plate = keyof typeof PLATE_NAMES;

/** The plate of a result on Phoenix and later; a failed stage has none */
export const calcPlate = (
  { great, good, bad, miss }: Judgements,
  isPass: boolean | null
): Plate | null => {
  if (isPass === false) {
    return null;
  }
  if (miss + bad + good + great === 0) {
    return 'PG';
  }
  if (miss + bad + good === 0) {
    return 'UG';
  }
  if (miss + bad === 0) {
    return 'EG';
  }
  if (miss === 0) {
    return 'SG';
  }
  if (miss <= 5) {
    return 'MG';
  }
  if (miss <= 10) {
    return 'TG';
  }
  if (miss <= 20) {
    return 'FG';
  }
  return 'RG';
};

/** The grades of the combo-scoring mixes before Phoenix, as results store them */
export const COMBO_GRADES = [
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

/**
 * The lowest score possible for these judgements on a combo-scoring mix (XX and earlier).
 * Grade bonuses are left out, so this is a lower bound
 */
export const minScoreForStats = (
  { perfect, great, good, bad, miss }: Judgements,
  level: number | null
) =>
  ((perfect * 1000 + great * 500 + good * 100 - bad * 200 - miss * 500) * levelMultiplier(level)) /
  2;
