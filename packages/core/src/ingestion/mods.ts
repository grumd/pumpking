import { getRankMode, InvalidModsError, parseModsList } from '../scoring/mods';
import { UnrecognizedResult } from './errors';
import type { ChartInstance, ResultData } from './types';

/**
 * The result's mods, or null when a result with an inexact date has none. A result
 * with an exact date always has a mods list, which may be empty
 */
export const validateMods = (data: ResultData, { millionScoring }: { millionScoring: boolean }) => {
  if (data.mods_list == null) {
    if (data.exact_gain_date) {
      throw new UnrecognizedResult('Missing mods list');
    }
    return null;
  }
  try {
    return parseModsList(data.mods_list, { millionScoring });
  } catch (e) {
    throw e instanceof InvalidModsError ? new UnrecognizedResult(e.message) : e;
  }
};

// Before Phoenix, rank mode is the VJ mod
export const validateRankMode = (mods: string[], chart: ChartInstance) => {
  try {
    return getRankMode(mods, chart);
  } catch (e) {
    throw e instanceof InvalidModsError ? new UnrecognizedResult(e.message) : e;
  }
};
