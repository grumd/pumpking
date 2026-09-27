export const MIXES = {
  Phoenix2: 28,
  Phoenix: 27,
  XX: 26,
  Prime2: 25,
  Prime: 24,
} as const;

export type MixName = keyof typeof MIXES;

/**
 * Mix names as a literal tuple, for use in Zod enums:
 * `z.enum(MIX_NAMES)` keeps the per-mix literal types.
 * Add new mixes to MIXES only - everything else derives from it.
 */
export const MIX_NAMES = Object.keys(MIXES) as [MixName, ...MixName[]];
