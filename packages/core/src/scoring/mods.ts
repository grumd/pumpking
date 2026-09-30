/**
 * Mods (modifiers) of a result, stored as a space-separated `mods_list`. Ported from the
 * legacy piu-top validation (`scoring_combo.py`), which ingestion also uses: the same
 * mods are valid and the messages match.
 */

const MOD_NAMES = [
  'VJ',
  'EW',
  'RV',
  'AC',
  'DC',
  'V',
  'AP',
  'NS',
  'FD',
  'FL',
  'BGADARK',
  'BGAOFF',
  'X',
  'NX',
  'UA',
  'DR',
  'SI',
  'RI',
  'SN',
  'M',
  'RS',
  'HJ',
  'JR',
];

// Rank mode (VJ) can't be combined with these
const RANK_MODE_EXCLUDED_MODS = ['HJ', 'BGADARK', 'BGAOFF'];

export class InvalidModsError extends Error {}

// Returns the mod as it's stored (speed mods like `2X` become `2x`)
const validMod = (mod: string): string => {
  if (MOD_NAMES.includes(mod)) {
    return mod;
  }
  const autoVelocity = mod.match(/^AV(\d+)$/);
  if (autoVelocity && Number(autoVelocity[1]) >= 300 && Number(autoVelocity[1]) <= 999) {
    return mod;
  }
  if (/^\d(\.5)?[xX]$/.test(mod)) {
    return mod.toLowerCase();
  }
  throw new InvalidModsError(`Mod '${mod}' is invalid`);
};

/** The mods of a `mods_list`; throws an InvalidModsError for an unknown mod. */
export const parseModsList = (modsList: string): string[] => {
  const trimmed = modsList.trim();
  return trimmed === '' ? [] : trimmed.split(/\s+/).map(validMod);
};

export interface RankModeChart {
  label: string;
  level: number | null;
  // tracks.duration
  duration: string | null;
}

// Rank mode exists only on Standard-length, non-performance charts of level 13 and up
export const isRankModeAllowed = (chart: RankModeChart) =>
  chart.duration === 'Standard' &&
  !/^(SP|DP|COOP)/.test(chart.label) &&
  chart.level != null &&
  chart.level >= 13;

/** Whether the mods mean rank mode; throws an InvalidModsError if the chart can't have it. */
export const getRankMode = (mods: string[], chart: RankModeChart): boolean => {
  if (!mods.includes('VJ')) {
    return false;
  }
  if (!isRankModeAllowed(chart)) {
    throw new InvalidModsError('Invalid rank mode set for chart');
  }
  const excluded = RANK_MODE_EXCLUDED_MODS.find((mod) => mods.includes(mod));
  if (excluded) {
    throw new InvalidModsError(`Rank mode and ${excluded} can't be set simultaneously`);
  }
  return true;
};
