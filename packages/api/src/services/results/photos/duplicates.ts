import { db } from '@pumpking/database/db';

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
