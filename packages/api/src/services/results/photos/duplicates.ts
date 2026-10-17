import { db } from '@pumpking/database/db';

/**
 * Photos and plays that were added before (docs/photo-results/PLAN.md): a photo is never
 * read twice, and a second photo of the same play isn't added again
 */

/**
 * The result this photo shows, if it is known: the result added from it, or the play it
 * turned out to show when it was read before
 */
export const findPhotoResult = async (photoHash: string) => {
  const added = await db
    .selectFrom('results')
    .select('id')
    .where('photo_sha256', '=', photoHash)
    .executeTakeFirst();
  if (added) {
    return added;
  }
  const read = await db
    .selectFrom('photo_reads')
    .select('duplicate_result_id')
    .where('photo_sha256', '=', photoHash)
    .where('duplicate_result_id', 'is not', null)
    .executeTakeFirst();
  return read?.duplicate_result_id == null ? undefined : { id: read.duplicate_result_id };
};

/** Of the photos' hashes, the ones whose result is known (see findPhotoResult) */
export const findKnownPhotoHashes = async (photoHashes: string[]) => {
  const added = await db
    .selectFrom('results')
    .select('photo_sha256')
    .where('photo_sha256', 'in', photoHashes)
    .execute();
  const duplicates = await db
    .selectFrom('photo_reads')
    .select('photo_sha256')
    .distinct()
    .where('photo_sha256', 'in', photoHashes)
    .where('duplicate_result_id', 'is not', null)
    .execute();
  return [...new Set([...added, ...duplicates].map((row) => row.photo_sha256))];
};

/**
 * A photo of a play added before is never read again: its hash goes on that result when the
 * result has none (an older result, or one added by other means), and the reads count as
 * productive. A result with another photo's hash keeps it; this photo is remembered on its
 * reads, which still count as spend without a result (another file or angle of the play)
 */
export const rememberDuplicatePhoto = async (resultId: number, photoHash: string) => {
  const { numUpdatedRows } = await db
    .updateTable('results')
    .set({ photo_sha256: photoHash })
    .where('id', '=', resultId)
    .where('photo_sha256', 'is', null)
    .executeTakeFirst();
  if (Number(numUpdatedRows) === 0) {
    await db
      .updateTable('photo_reads')
      .set({ duplicate_result_id: resultId })
      .where('photo_sha256', '=', photoHash)
      .execute();
  }
};

export interface PlayStats {
  perfect: number;
  great: number;
  good: number;
  bad: number;
  miss: number;
  combo: number;
}

/**
 * The same play added before: a result of the player on the chart with the same judgements
 * and max combo (a second photo of the same screen)
 */
export const findSamePlay = (playerId: number, sharedChartId: number, stats: PlayStats) =>
  db
    .selectFrom('results')
    .select('id')
    .where('player_id', '=', playerId)
    .where('shared_chart', '=', sharedChartId)
    .where('perfects', '=', stats.perfect)
    .where('greats', '=', stats.great)
    .where('goods', '=', stats.good)
    .where('bads', '=', stats.bad)
    .where('misses', '=', stats.miss)
    .where('max_combo', '=', stats.combo)
    .executeTakeFirst();
