import { useAtomValue } from 'jotai';
import { z } from 'zod';
import type { ChartsFilter } from './useChartsQuery';
import { atomWithValidatedStorage } from 'utils/jotai';

export const filterAtom = atomWithValidatedStorage<ChartsFilter>(
  'filterAtom',
  z.object({
    scoring: z.enum(['xx', 'phoenix']).optional(),
    duration: z.enum(['Full', 'Remix', 'Short', 'Standard']).optional(),
    minLevel: z.number().optional(),
    maxLevel: z.number().optional(),
    label: z.string().optional(),
    mixes: z.array(z.number()).optional(),
    songName: z.string().optional(),
    playersSome: z.array(z.number()).optional(),
    playersNone: z.array(z.number()).optional(),
    playersAll: z.array(z.number()).optional(),
    sortChartsBy: z.enum(['date', 'difficulty', 'pp']).optional(),
    sortChartsDir: z.enum(['asc', 'desc']).optional(),
    sortChartsByPlayers: z.array(z.number()).optional(),
    cursor: z.number().nullish(),
    pageSize: z.number(),
  }),
  {
    mixes: [26, 27],
    scoring: 'phoenix',
  }
);

export const useFilter = () => {
  return useAtomValue(filterAtom);
};
