const COMBO_MOD_NAMES = [
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

const MILLION_MOD_NAMES = [
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
  'PASS',
  'PASS_G',
  'PASS_M',
];

const RANK_MODE_EXCLUDED_MODS = ['HJ', 'BGADARK', 'BGAOFF'];

export class InvalidModsError extends Error {}

const validMod = (mod: string, modNames: string[]): string => {
  if (modNames.includes(mod)) {
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

export const parseModsList = (
  modsList: string,
  { millionScoring = false }: { millionScoring?: boolean } = {}
): string[] => {
  const modNames = millionScoring ? MILLION_MOD_NAMES : COMBO_MOD_NAMES;
  const trimmed = modsList.trim();
  return trimmed === '' ? [] : trimmed.split(/\s+/).map((mod) => validMod(mod, modNames));
};

export interface RankModeChart {
  label: string;
  level: number | null;
  duration: string | null;
}

export const isRankModeAllowed = (chart: RankModeChart) =>
  chart.duration === 'Standard' &&
  !/^(SP|DP|COOP)/.test(chart.label) &&
  chart.level != null &&
  chart.level >= 13;

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
