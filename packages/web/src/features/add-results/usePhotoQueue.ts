import type { ApiOutputs } from '@/api/trpc/router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TRPCClientError } from '@trpc/client';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useUser } from 'hooks/useUser';

import { api } from 'utils/trpc';

import { type PreparedPhoto, hashFile, preparePhoto } from './preparePhoto';

type Outcome = ApiOutputs['results']['recognizePhotoMutation'];
export type NeedsInput = Extract<Outcome, { status: 'needsInput' }>;
export type PhotoField = NeedsInput['fields'][number];
export type PhotoValues = NonNullable<NeedsInput['values']>;
export type PhotoChart = NonNullable<NeedsInput['chart']>;

// The mixes with arcade track names, which the song title is matched against
export const PHOTO_MIXES = ['Phoenix2', 'Phoenix', 'XX'] as const;
export type PhotoMix = (typeof PHOTO_MIXES)[number];

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
  // A photo selected on its own: read and checked, but the user confirms it
  review: boolean;
  status: PhotoStatus;
  hash: string | null;
  // Kept while the photo is in progress or waits for the user
  prepared?: PreparedPhoto;
  needsInput?: NeedsInput;
  saved?: { chart: PhotoChart; score: number };
  error?: string;
  // Over a cost limit: which one, and when the player can upload again
  limited?: { limit: 'unproductive' | 'total'; retryAt: Date };
  // Cancelled while it was being read: only a saved result is kept
  cancelled?: boolean;
}

// The photos that stop the queue until the user acts
const isBlocking = (item: QueueItem) =>
  item.status === 'reading' ||
  item.status === 'needsInput' ||
  item.status === 'failed' ||
  item.status === 'limited';

export const isDone = (item: QueueItem) =>
  item.status === 'saved' || item.status === 'duplicate' || item.status === 'skipped';

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

const isConflict = (e: unknown) => e instanceof TRPCClientError && e.data?.httpStatus === 409;

let nextId = 1;

/**
 * The photos selected on the "Add results" page, read one at a time. A photo that needs
 * the user's input pauses the queue until it is submitted or skipped
 */
export const usePhotoQueue = () => {
  const queryClient = useQueryClient();
  const user = useUser();
  const [items, setItems] = useState<QueueItem[]>([]);
  const processing = useRef<number | null>(null);

  const checkHashes = useMutation(api.results.checkPhotoHashes.mutationOptions());
  const recognize = useMutation(api.results.recognizePhotoMutation.mutationOptions());
  const addResult = useMutation(api.results.addResultMutation.mutationOptions());

  const update = useCallback((id: number, change: Partial<QueueItem>) => {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== id) {
          return item;
        }
        const kept = change.status === 'saved' || change.status === 'duplicate';
        if (item.cancelled && change.status && !kept) {
          return { ...item, status: 'skipped', prepared: undefined, needsInput: undefined };
        }
        return { ...item, ...change };
      })
    );
  }, []);

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
      // One check for the whole batch, before anything is uploaded. If it fails, the
      // server still checks each photo before reading it
      const known: (string | null)[] = await checkHashes
        .mutateAsync({ hashes: [...new Set(hashes.values())] })
        .catch(() => []);

      setItems((current) => {
        // A skipped photo can be selected again
        const seen = new Set(
          current.flatMap((item) => (item.hash && item.status !== 'skipped' ? [item.hash] : []))
        );
        return current.map((item) => {
          const hash = hashes.get(item.id);
          // Cancelled while it was hashed
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
    async ({ hash, ...item }: QueueItem) => {
      // A photo waits for its turn only once it's hashed
      if (!hash) {
        return;
      }
      update(item.id, { status: 'reading', error: undefined });
      let prepared = item.prepared;
      try {
        prepared ??= await preparePhoto(item.file);
      } catch (e) {
        update(item.id, { status: 'failed', error: errorText(e) });
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
          update(item.id, {
            status: 'saved',
            prepared: undefined,
            saved: { chart: outcome.chart, score: outcome.values.score },
          });
          invalidateCharts();
        } else if (outcome.status === 'duplicate') {
          update(item.id, { status: 'duplicate', prepared: undefined });
        } else if (outcome.status === 'limited') {
          update(item.id, {
            status: 'limited',
            prepared,
            limited: { limit: outcome.limit, retryAt: outcome.retryAt },
          });
        } else {
          update(item.id, { status: 'needsInput', prepared, needsInput: outcome });
        }
      } catch (e) {
        update(item.id, { status: 'failed', prepared, error: errorText(e) });
      }
    },
    [recognize, update, invalidateCharts]
  );

  // The next photo is read when nothing is in progress or waiting for the user
  const blocked = items.some(isBlocking);
  const next = blocked ? undefined : items.find((item) => item.status === 'waiting');
  useEffect(() => {
    if (next && processing.current !== next.id) {
      processing.current = next.id;
      read(next);
    }
  }, [next, read]);

  /** Adds the result as the user filled it in. Throws for the form to show the error */
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

  const skip = useCallback(
    (item: QueueItem) =>
      update(item.id, { status: 'skipped', prepared: undefined, needsInput: undefined }),
    [update]
  );

  const retry = useCallback(
    (item: QueueItem) => {
      processing.current = null;
      update(item.id, { status: 'waiting', error: undefined });
    },
    [update]
  );

  // A photo the readers couldn't read, typed in by hand
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

  // A new selection waits until every photo of the last one is done
  const busy = items.some((item) => !isDone(item));

  // Skips every photo that isn't done. The one being read finishes: a result it saved stays
  const cancel = useCallback(() => {
    setItems((current) =>
      current.map((item) => {
        if (isDone(item)) {
          return item;
        }
        if (item.status === 'reading') {
          return { ...item, cancelled: true };
        }
        return { ...item, status: 'skipped', prepared: undefined, needsInput: undefined };
      })
    );
  }, []);

  return { items, busy, addFiles, submit, skip, retry, enterByHand, cancel };
};
