import type { ApiInputs, ApiOutputs } from '@/api/trpc/router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TRPCClientError } from '@trpc/client';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useUser } from 'hooks/useUser';

import { api } from 'utils/trpc';

import { type PreparedPhoto, hashFile, preparePhoto } from './preparePhoto';

type Outcome = ApiOutputs['results']['recognizePhotoMutation'];
export type NeedsInput = Extract<Outcome, { status: 'needsInput' }>;
type Limited = Extract<Outcome, { status: 'limited' }>;
export type PhotoField = NeedsInput['fields'][number];
export type PhotoValues = NonNullable<NeedsInput['values']>;
export type PhotoChart = NonNullable<NeedsInput['chart']>;

export type PhotoMix = ApiInputs['results']['recognizePhotoMutation']['mix'];

export const ALL_FIELDS: PhotoField[] = ['chart', 'perfect', 'great', 'good', 'bad', 'miss', 'combo', 'score', 'grade', 'pass', 'mod']; // prettier-ignore

export type PhotoStatus =
  | 'hashing'
  | 'waiting'
  | 'reading'
  | 'saved'
  | 'duplicate'
  | 'needsInput'
  | 'failed'
  | 'limited'
  | 'skipped';

export interface QueueItem {
  id: number;
  file: File;
  mix: PhotoMix;
  review: boolean;
  status: PhotoStatus;
  hash: string | null;
  prepared?: PreparedPhoto;
  needsInput?: NeedsInput;
  saved?: { chart: PhotoChart; score: number };
  error?: string;
  limited?: Pick<Limited, 'limit' | 'retryAt'>;
  cancelled?: boolean;
}

const isBlocking = (item: QueueItem) =>
  item.status === 'reading' ||
  item.status === 'needsInput' ||
  item.status === 'failed' ||
  item.status === 'limited';

export const isDone = (item: QueueItem) =>
  item.status === 'saved' || item.status === 'duplicate' || item.status === 'skipped';

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

const SKIPPED = { status: 'skipped', prepared: undefined, needsInput: undefined } as const;

const isConflict = (e: unknown) => e instanceof TRPCClientError && e.data?.httpStatus === 409;

let nextId = 1;

export const usePhotoQueue = () => {
  const queryClient = useQueryClient();
  const user = useUser();
  const [items, setItems] = useState<QueueItem[]>([]);
  const processing = useRef<number | null>(null);

  const checkHashes = useMutation(api.results.checkPhotoHashes.mutationOptions());
  const recognize = useMutation(api.results.recognizePhotoMutation.mutationOptions());
  const addResult = useMutation(api.results.addResultMutation.mutationOptions());

  const update = useCallback((id: number, change: Partial<QueueItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...change } : item)));
  }, []);

  const finishRead = useCallback(
    (id: number, change: Partial<QueueItem> & { status: PhotoStatus }) => {
      const kept = change.status === 'saved' || change.status === 'duplicate';
      setItems((current) =>
        current.map((item) => {
          if (item.id !== id) {
            return item;
          }
          return item.cancelled && !kept ? { ...item, ...SKIPPED } : { ...item, ...change };
        })
      );
    },
    []
  );

  const invalidateCharts = useCallback(() => {
    queryClient.invalidateQueries(api.charts.chart.queryFilter());
    queryClient.invalidateQueries(api.charts.search.infiniteQueryFilter());
  }, [queryClient]);

  const addFiles = useCallback(
    async (files: File[], mix: PhotoMix) => {
      const added: QueueItem[] = files.map((file) => ({
        id: nextId++,
        file,
        mix,
        review: files.length === 1,
        status: 'hashing',
        hash: null,
      }));
      setItems((current) => [...current, ...added]);

      const hashes = new Map<number, string>();
      for (const item of added) {
        hashes.set(item.id, await hashFile(item.file));
      }
      const known: (string | null)[] = await checkHashes
        .mutateAsync({ hashes: [...new Set(hashes.values())] })
        .catch(() => []);

      setItems((current) => {
        const seen = new Set(
          current.flatMap((item) => (item.hash && item.status !== 'skipped' ? [item.hash] : []))
        );
        return current.map((item) => {
          const hash = hashes.get(item.id);
          if (!hash || item.status !== 'hashing') {
            return item;
          }
          const duplicate = known.includes(hash) || seen.has(hash);
          seen.add(hash);
          return { ...item, hash, status: duplicate ? 'duplicate' : 'waiting' };
        });
      });
    },
    [checkHashes]
  );

  const read = useCallback(
    async (item: QueueItem) => {
      const { hash } = item;
      if (!hash) {
        return;
      }
      update(item.id, { status: 'reading', error: undefined });
      let prepared = item.prepared;
      try {
        prepared ??= await preparePhoto(item.file);
      } catch (e) {
        finishRead(item.id, { status: 'failed', error: errorText(e) });
        return;
      }
      try {
        const outcome = await recognize.mutateAsync({
          image: prepared.image,
          screenshot: prepared.screenshot,
          hash,
          mix: item.mix,
          date: prepared.date,
          isExactDate: prepared.isExactDate,
          autoSave: !item.review,
        });
        if (outcome.status === 'saved') {
          finishRead(item.id, {
            status: 'saved',
            prepared: undefined,
            saved: { chart: outcome.chart, score: outcome.values.score },
          });
          invalidateCharts();
        } else if (outcome.status === 'duplicate') {
          finishRead(item.id, { status: 'duplicate', prepared: undefined });
        } else if (outcome.status === 'limited') {
          finishRead(item.id, {
            status: 'limited',
            prepared,
            limited: { limit: outcome.limit, retryAt: outcome.retryAt },
          });
        } else {
          finishRead(item.id, { status: 'needsInput', prepared, needsInput: outcome });
        }
      } catch (e) {
        finishRead(item.id, { status: 'failed', prepared, error: errorText(e) });
      }
    },
    [recognize, update, finishRead, invalidateCharts]
  );

  const blocked = items.some(isBlocking);
  const next = blocked ? undefined : items.find((item) => item.status === 'waiting');
  useEffect(() => {
    if (next && processing.current !== next.id) {
      processing.current = next.id;
      read(next);
    }
  }, [next, read]);

  const submit = useCallback(
    async (item: QueueItem, chart: PhotoChart, values: PhotoValues) => {
      if (!item.prepared || !user.data) {
        return;
      }
      try {
        await addResult.mutateAsync({
          ...values,
          screenshot: item.prepared.screenshot,
          fileName: item.file.name,
          playerId: user.data.id,
          mix: item.mix,
          date: item.prepared.date,
          isExactDate: item.prepared.isExactDate,
          sharedChartId: chart.sharedChartId,
          photoHash: item.hash ?? undefined,
        });
      } catch (e) {
        if (isConflict(e)) {
          update(item.id, { status: 'duplicate', prepared: undefined, needsInput: undefined });
          return;
        }
        throw e;
      }
      update(item.id, {
        status: 'saved',
        prepared: undefined,
        needsInput: undefined,
        saved: { chart, score: values.score },
      });
      invalidateCharts();
    },
    [addResult, update, user.data, invalidateCharts]
  );

  const skip = useCallback((item: QueueItem) => update(item.id, SKIPPED), [update]);

  const retry = useCallback(
    (item: QueueItem) => {
      processing.current = null;
      update(item.id, { status: 'waiting', error: undefined });
    },
    [update]
  );

  const enterByHand = useCallback(
    (item: QueueItem) =>
      update(item.id, {
        status: 'needsInput',
        needsInput: {
          status: 'needsInput',
          reads: [],
          chart: null,
          values: null,
          readValues: [],
          fields: ALL_FIELDS,
        },
      }),
    [update]
  );

  const busy = items.some((item) => !isDone(item));

  const cancel = useCallback(() => {
    setItems((current) =>
      current.map((item) => {
        if (isDone(item)) {
          return item;
        }
        if (item.status === 'reading') {
          return { ...item, cancelled: true };
        }
        return { ...item, ...SKIPPED };
      })
    );
  }, []);

  return { items, busy, addFiles, submit, skip, retry, enterByHand, cancel };
};
