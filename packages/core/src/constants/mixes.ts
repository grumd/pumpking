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
