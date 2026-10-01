import { UnrecognizedResult } from './errors';
import type { ResultData } from './types';
import { parseModsList } from '@pumpking/utils/mods';

/**
 * The result's mods, or null when a result with an inexact date has none. A result
 * with an exact date always has a mods list, which may be empty. Throws an
 * InvalidModsError for an unknown mod
 */
export const getResultMods = (
  data: ResultData,
  { millionScoring }: { millionScoring: boolean }
) => {
  if (data.mods_list == null) {
    if (data.exact_gain_date) {
      throw new UnrecognizedResult('Missing mods list');
    }
    return null;
  }
  return parseModsList(data.mods_list, { millionScoring });
};
