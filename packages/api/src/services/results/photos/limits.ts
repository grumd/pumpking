import { db } from '@pumpking/database/db';
import { addEvent } from '@pumpking/database/events';
import { sql } from 'kysely';

export type PhotoLimitKind = 'unproductive' | 'total';

interface PhotoLimit {
  kind: PhotoLimitKind;
  windowHours: number;
  maxCost: number;
}

export const PHOTO_LIMITS: PhotoLimit[] = [
  { kind: 'unproductive', windowHours: 24, maxCost: 0.03 },
  { kind: 'total', windowHours: 72, maxCost: 0.5 },
];

export const ADMIN_LIMIT_MULTIPLIER = 10;

export interface PhotoReadSpend {
  cost: number;
  ageSeconds: number;
  productive: boolean;
}

export interface LimitReached {
  kind: PhotoLimitKind;
  windowHours: number;
  retryInSeconds: number;
}

export const checkPhotoLimits = (
  reads: PhotoReadSpend[],
  isAdmin: boolean
): LimitReached | null => {
  let reached: LimitReached | null = null;
  for (const limit of PHOTO_LIMITS) {
    const windowSeconds = limit.windowHours * 3600;
    const maxCost = limit.maxCost * (isAdmin ? ADMIN_LIMIT_MULTIPLIER : 1);
    const counted = reads
      .filter((read) => read.ageSeconds < windowSeconds)
      .filter((read) => limit.kind === 'total' || !read.productive)
      .sort((a, b) => b.ageSeconds - a.ageSeconds);
    let spent = counted.reduce((sum, read) => sum + read.cost, 0);
    if (spent < maxCost) {
      continue;
    }
    let retryInSeconds = 0;
    for (const read of counted) {
      spent -= read.cost;
      if (spent < maxCost) {
        retryInSeconds = Math.ceil(windowSeconds - read.ageSeconds);
        break;
      }
    }
    if (!reached || retryInSeconds > reached.retryInSeconds) {
      reached = { kind: limit.kind, windowHours: limit.windowHours, retryInSeconds };
    }
  }
  return reached;
};

const longestWindowHours = Math.max(...PHOTO_LIMITS.map((limit) => limit.windowHours));

const getPhotoReadSpend = async (playerId: number): Promise<PhotoReadSpend[]> => {
  const rows = await db
    .selectFrom('photo_reads')
    .select(({ exists, selectFrom }) => [
      'photo_reads.cost',
      sql<number>`TIMESTAMPDIFF(MICROSECOND, photo_reads.created_at, UTC_TIMESTAMP(3)) / 1000000`.as(
        'ageSeconds'
      ),
      exists(
        selectFrom('results')
          .select('results.id')
          .whereRef('results.photo_sha256', '=', 'photo_reads.photo_sha256')
      ).as('productive'),
    ])
    .where('photo_reads.player_id', '=', playerId)
    .where(
      'photo_reads.created_at',
      '>',
      sql<Date>`UTC_TIMESTAMP(3) - INTERVAL ${longestWindowHours} HOUR`
    )
    .execute();
  return rows.map((row) => ({
    cost: Number(row.cost),
    ageSeconds: Number(row.ageSeconds),
    productive: Boolean(Number(row.productive)),
  }));
};

export const getPhotoLimitReached = async (playerId: number, isAdmin: boolean) => {
  const reached = checkPhotoLimits(await getPhotoReadSpend(playerId), isAdmin);
  if (!reached) {
    return null;
  }
  return { ...reached, retryAt: new Date(Date.now() + reached.retryInSeconds * 1000) };
};

export const reportPhotoLimitReached = async (
  playerId: number,
  reached: { kind: PhotoLimitKind; windowHours: number; retryAt: Date }
) => {
  const notified = await db
    .selectFrom('events')
    .select('id')
    .where('type', '=', 'photoLimitReached')
    .where(sql`JSON_EXTRACT(payload, '$.playerId')`, '=', playerId)
    .where(sql`JSON_UNQUOTE(JSON_EXTRACT(payload, '$.limit'))`, '=', reached.kind)
    .where('created_at', '>', sql<Date>`UTC_TIMESTAMP(3) - INTERVAL ${reached.windowHours} HOUR`)
    .executeTakeFirst();
  if (!notified) {
    await addEvent(db, 'photoLimitReached', {
      playerId,
      limit: reached.kind,
      retryAt: reached.retryAt.toISOString(),
    });
  }
};

export const addPhotoRead = (playerId: number, photoHash: string, cost: number) =>
  db
    .insertInto('photo_reads')
    .values({
      player_id: playerId,
      photo_sha256: photoHash,
      cost,
      created_at: sql`UTC_TIMESTAMP(3)`,
    })
    .execute();
