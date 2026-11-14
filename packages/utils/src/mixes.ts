const ALL_MIX_NAMES = [
  '1st',
  '2nd',
  'OBG',
  'OBG_SE',
  'Collection',
  'Perfect',
  'Extra',
  'Premiere',
  'Prex',
  'Premiere2',
  'Rebirth',
  'Prex2',
  'Premiere3',
  'Prex3',
  'Exceed',
  'Exceed2',
  'Zero',
  'NX',
  'NX2',
  'NXA',
  'Fiesta',
  'FiestaEX',
  'Fiesta2',
  'Prime',
  'Prime2',
  'XX',
  'Phoenix',
  'Phoenix2',
];

export const findMixId = (mixName: string): number | null => {
  const index = ALL_MIX_NAMES.indexOf(mixName);
  return index === -1 ? null : index + 1;
};

export const MIXES = {
  Phoenix2: 28,
  Phoenix: 27,
  XX: 26,
  Prime2: 25,
  Prime: 24,
} as const;

export type MixName = keyof typeof MIXES;

export const SUPPORTED_MIXES: number[] = [MIXES.XX, MIXES.Phoenix, MIXES.Phoenix2];

export const MIX_NAMES = Object.keys(MIXES) as [MixName, ...MixName[]];

export const MIX_NAME_BY_ID = Object.fromEntries(
  Object.entries(MIXES).map(([name, id]) => [id, name])
) as Record<number, MixName>;

export const ARCADE_NAME_MIXES: number[] = [MIXES.XX, MIXES.Phoenix, MIXES.Phoenix2];

export const isMillionScoringMix = (mixId: number) => mixId >= MIXES.Phoenix;
