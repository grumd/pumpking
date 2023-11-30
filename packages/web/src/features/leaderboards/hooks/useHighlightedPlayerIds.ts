import { useAtomValue } from 'jotai';

import { filterAtom } from './useFilter';

export const useHighlightedPlayerIds = (): number[] => {
  const filter = useAtomValue(filterAtom);
  return [
    ...(filter.playersAll ?? []),
    ...(filter.playersNone ?? []),
    ...(filter.playersSome ?? []),
    ...(filter.sortChartsByPlayers ?? []),
  ];
};
