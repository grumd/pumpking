import { UnrecognizedResult } from './errors';
import type { ResultData } from './types';
import { parseModsList } from '@pumpking/utils/mods';

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
