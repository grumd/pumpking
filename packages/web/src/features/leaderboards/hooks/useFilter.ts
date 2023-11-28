import { useAtomValue } from 'jotai';
import { z } from 'zod';

import { atomWithValidatedStorage } from 'utils/jotai';

import type { ChartsFilter } from './useChartsQuery';

export const initialFilter: ChartsFilter = {
  mixes: [26, 27],
  scoring: 'phoenix',
};

export const filterAtom = atomWithValidatedStorage<ChartsFilter>(
  'filterAtom',
  z.object({
    scoring: z.enum(['xx', 'phoenix']).optional(),
    durations: z.array(z.enum(['Full', 'Remix', 'Short', 'Standard'])).optional(),
    minLevel: z.number().optional(),
    maxLevel: z.number().optional(),
    labels: z.array(z.string()).optional(),
    mixes: z.array(z.number()).optional(),
    songName: z.string().optional(),
    playersSome: z.array(z.number()).optional(),
    playersNone: z.array(z.number()).optional(),
    playersAll: z.array(z.number()).optional(),
    sortChartsBy: z.enum(['date', 'difficulty', 'pp']).optional(),
    sortChartsDir: z.enum(['asc', 'desc']).optional(),
    sortChartsByPlayers: z.array(z.number()).optional(),
    cursor: z.number().nullish(),
  }),
  initialFilter
);

export const useFilter = () => {
  return useAtomValue(filterAtom);
};
