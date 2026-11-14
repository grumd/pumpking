import type { DB } from './database';
import { db } from './db';
import { type Kysely, sql } from 'kysely';

export interface EventPayloads {
  resultAdded: { resultId: number };
  resultChanged: { resultId: number; sharedChartId: number; playerIds: number[] };
  ppRecalculated: Record<string, never>;
  tournamentStarted: { tournamentId: number };
  tournamentEnded: { tournamentId: number };
  photoLimitReached: { playerId: number; limit: 'unproductive' | 'total'; retryAt: string };
}

export type EventType = keyof EventPayloads;

export type Event = {
  [T in EventType]: { id: number; type: T; payload: EventPayloads[T] };
}[EventType];

export const addEvent = async <T extends EventType>(
  trx: Kysely<DB>,
  type: T,
  payload: EventPayloads[T]
) => {
  await trx
    .insertInto('events')
    .values({ type, payload: JSON.stringify(payload), created_at: sql`UTC_TIMESTAMP(3)` })
    .execute();
};

export const deleteOldEvents = async (days: number) => {
  const oldestCursor = await db
    .selectFrom('event_cursors')
    .select((eb) => eb.fn.min('event_id').as('event_id'))
    .executeTakeFirst();
  if (oldestCursor?.event_id == null) {
    return;
  }

  await db
    .deleteFrom('events')
    .where('created_at', '<', sql<Date>`UTC_TIMESTAMP(3) - INTERVAL ${days} DAY`)
    .where('id', '<=', oldestCursor.event_id)
    .where('id', 'not in', db.selectFrom('event_failures').select('event_id'))
    .execute();
};

const BATCH_SIZE = 100;

const GAP_TIMEOUT_SECONDS = 10;

const MAX_ATTEMPTS = 5;

export const createEventConsumer = (consumer: string, handle: (event: Event) => Promise<void>) => {
  const failedAttempts = new Map<number, number>();

  const saveCursor = async (eventId: number) => {
    await db
      .insertInto('event_cursors')
      .values({ consumer, event_id: eventId, updated_at: sql`UTC_TIMESTAMP(3)` })
      .onDuplicateKeyUpdate({ event_id: eventId, updated_at: sql`UTC_TIMESTAMP(3)` })
      .execute();
  };

  const saveFailure = async (eventId: number, attempts: number, error: unknown) => {
    const failure = {
      attempts,
      error: error instanceof Error ? error.stack ?? error.message : String(error),
      failed_at: sql<Date>`UTC_TIMESTAMP(3)`,
    };
    await db
      .insertInto('event_failures')
      .values({ consumer, event_id: eventId, ...failure })
      .onDuplicateKeyUpdate(failure)
      .execute();
  };

  const processBatch = async () => {
    const cursor = await db
      .selectFrom('event_cursors')
      .select('event_id')
      .where('consumer', '=', consumer)
      .executeTakeFirst();
    let lastId = cursor?.event_id ?? 0;

    const events = await db
      .selectFrom('events')
      .select([
        'id',
        'type',
        'payload',
        sql<number>`created_at < UTC_TIMESTAMP(3) - INTERVAL ${GAP_TIMEOUT_SECONDS} SECOND`.as(
          'is_past_gap_timeout'
        ),
      ])
      .where('id', '>', lastId)
      .orderBy('id')
      .limit(BATCH_SIZE)
      .execute();

    for (const event of events) {
      if (event.id !== lastId + 1 && !event.is_past_gap_timeout) {
        return;
      }

      try {
        await handle({ id: event.id, type: event.type, payload: event.payload } as Event);
      } catch (error) {
        const attempts = (failedAttempts.get(event.id) ?? 0) + 1;
        if (attempts < MAX_ATTEMPTS) {
          console.error(`${consumer}: event ${event.id} failed (attempt ${attempts})`, error);
          failedAttempts.set(event.id, attempts);
          return;
        }
        console.error(`${consumer}: skipping event ${event.id} after ${attempts} attempts`, error);
        await saveFailure(event.id, attempts, error);
      }

      failedAttempts.delete(event.id);
      lastId = event.id;
      await saveCursor(lastId);
    }
  };

  return { processBatch };
};
