import { db } from '@pumpking/database/db';
import { addEvent } from '@pumpking/database/events';
import { sql } from 'kysely';

/**
 * Per-player cost limits of reading photos (docs/photo-results/PLAN.md, "Cost limits").
 * Reads that ended in a result count only towards the overall ceiling, so players who
 * upload real results rarely meet a limit, and random images run into one soon
 */

export type PhotoLimitKind = 'unproductive' | 'total';

interface PhotoLimit {
  kind: PhotoLimitKind;
  windowHours: number;
  // USD
  maxCost: number;
}

export const PHOTO_LIMITS: PhotoLimit[] = [
  // Spend on photos that gave no result: about 20 random images
  { kind: 'unproductive', windowHours: 24, maxCost: 0.03 },
  // All spend: about 400 real photos
  { kind: 'total', windowHours: 72, maxCost: 0.5 },
];

export const ADMIN_LIMIT_MULTIPLIER = 10;

export interface PhotoReadSpend {
  cost: number;
  ageSeconds: number;
  // A result with the photo's hash exists
  productive: boolean;
}

export interface LimitReached {
  kind: PhotoLimitKind;
  windowHours: number;
  // When enough of the spend leaves the window for the player to be under the limit again
  retryInSeconds: number;
}

/** The limit the player is over, from the reads of the longest window; null when none */
export const checkPhotoLimits = (
  reads: PhotoReadSpend[],
  isAdmin: boolean
): LimitReached | null => {
  let reached: LimitReached | null = null;
  for (const limit of PHOTO_LIMITS) {
    const windowSeconds = limit.windowHours * 3600;
    const maxCost = limit.maxCost * (isAdmin ? ADMIN_LIMIT_MULTIPLIER : 1);
    // Oldest first: they are the first to leave the window
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

/**
 * Whether the player may have a photo read: the limit they are over and when they can read
 * again, or null. The first refusal of a limit within its window tells the admins
 */
export const getPhotoLimitReached = async (playerId: number, isAdmin: boolean) => {
  const reached = checkPhotoLimits(await getPhotoReadSpend(playerId), isAdmin);
  if (!reached) {
    return null;
  }
  const retryAt = new Date(Date.now() + reached.retryInSeconds * 1000);

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
      retryAt: retryAt.toISOString(),
    });
  }
  return { kind: reached.kind, retryAt };
};

/** Logs a paid read, for the limits */
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
