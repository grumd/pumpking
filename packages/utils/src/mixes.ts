/**
 * Every mix, in order: a mix's id is its position + 1, as in the `mixes` table. piu-spy
 * sends results by these names
 */
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

/** The id of any mix by its name, or null for an unknown name */
export const findMixId = (mixName: string): number | null => {
  const index = ALL_MIX_NAMES.indexOf(mixName);
  return index === -1 ? null : index + 1;
};

/** The mixes the site works with (ids as in ALL_MIX_NAMES) */
export const MIXES = {
  Phoenix2: 28,
  Phoenix: 27,
  XX: 26,
  Prime2: 25,
  Prime: 24,
} as const;

export type MixName = keyof typeof MIXES;

/** Mixes that share one tournament pool (docs/tournaments/PLAN.md). */
export const SUPPORTED_MIXES: number[] = [MIXES.XX, MIXES.Phoenix, MIXES.Phoenix2];

/**
 * Mix names as a literal tuple, for use in Zod enums:
 * `z.enum(MIX_NAMES)` keeps the per-mix literal types.
 * Add new mixes to MIXES only - everything else derives from it.
 */
export const MIX_NAMES = Object.keys(MIXES) as [MixName, ...MixName[]];

export const MIX_NAME_BY_ID = Object.fromEntries(
  Object.entries(MIXES).map(([name, id]) => [id, name])
) as Record<number, MixName>;

/**
 * Mixes that piu-spy recognizes results on. Arcade names of players
 * (`arcade_player_names`) and tracks (`arcade_track_names`) are kept per mix for them,
 * since they change between mixes.
 */
export const ARCADE_NAME_MIXES: number[] = [MIXES.XX, MIXES.Phoenix, MIXES.Phoenix2];

/** Mixes from Phoenix on score up to 1,000,000; their score is also the phoenix score. */
export const isMillionScoringMix = (mixId: number) => mixId >= MIXES.Phoenix;
