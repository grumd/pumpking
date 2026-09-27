import { useAtomValue } from 'jotai';
import { z } from 'zod';

import { atomWithValidatedStorage } from 'utils/jotai';

import type { ChartsFilter } from './useChartsQuery';

export const initialFilter: ChartsFilter = {
  mixes: [26, 27, 28],
  songName: '',
  labels: ['S', 'D'],
};

const FILTER_STORAGE_KEY = 'filterAtom';
const PHOENIX2_MIGRATION_FLAG_KEY = `${FILTER_STORAGE_KEY}_phoenix2MixMigrated`;

/**
 * One-time migration for the Phoenix 2 release: before it, the default mix filter was [26, 27].
 * Users who never changed the mix filter have exactly [26, 27] stored - add 28 for them.
 * Custom mix selections are left untouched.
 */
const migrateStoredFilterForPhoenix2 = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  if (window.localStorage.getItem(PHOENIX2_MIGRATION_FLAG_KEY)) {
    return;
  }
  try {
    const stored = window.localStorage.getItem(FILTER_STORAGE_KEY);
    if (!stored) {
      return;
    }
    const parsed: { mixes?: unknown } = JSON.parse(stored);
    const mixes = parsed?.mixes;
    const isOldDefaultMixes =
      Array.isArray(mixes) && mixes.length === 2 && mixes[0] === 26 && mixes[1] === 27;
    if (isOldDefaultMixes) {
      parsed.mixes = [26, 27, 28];
      window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(parsed));
    }
  } catch (error) {
    console.error('Error migrating stored filter:', error);
  } finally {
    window.localStorage.setItem(PHOENIX2_MIGRATION_FLAG_KEY, '1');
  }
};

migrateStoredFilterForPhoenix2();

export const filterAtom = atomWithValidatedStorage<ChartsFilter>(
  FILTER_STORAGE_KEY,
  z.object({
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
  }),
  structuredClone(initialFilter)
);

export const useFilter = () => {
  return useAtomValue(filterAtom);
};
