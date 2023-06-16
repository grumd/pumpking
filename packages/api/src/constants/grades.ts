export enum Grade {
  SSS = 'SSS',
  SS = 'SS',
  S = 'S',
  Ap = 'A+',
  A = 'A',
  Bp = 'B+',
  B = 'B',
  Cp = 'C+',
  C = 'C',
  Dp = 'D+',
  D = 'D',
  Fp = 'F+',
  F = 'F',
  Unknown = '?',
}

export const isValidGrade = (grade: string | null): grade is Grade =>
  grade ? Object.values(Grade).includes(grade as Grade) : false;

export const gradeSortValue: Record<Grade, number> = {
  [Grade.SSS]: 12,
  [Grade.SS]: 11,
  [Grade.S]: 10,
  [Grade.Ap]: 9,
  [Grade.A]: 8,
  [Grade.Bp]: 7,
  [Grade.B]: 6,
  [Grade.Cp]: 5,
  [Grade.C]: 4,
  [Grade.Dp]: 3,
  [Grade.D]: 2,
  [Grade.Fp]: 1,
  [Grade.F]: 0,
  [Grade.Unknown]: -1,
};
