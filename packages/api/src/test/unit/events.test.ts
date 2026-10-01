import { db } from '@pumpking/database/db';
import {
  addEvent,
  createEventConsumer,
  deleteOldEvents,
  type Event,
} from '@pumpking/database/events';
import { getPhoenixScore } from '@pumpking/utils/phoenixScore';
import { assert } from 'chai';
import fs from 'fs';
import { startEffectsJob } from 'jobs/effectsJob';
import { sql } from 'kysely';
import path from 'path';
import { resultAddedEffect } from 'services/results/resultAddedEffect';
import { applyEffects, req } from 'test/helpers';
import { addResultsSession } from 'test/helpers/sessions';

const screenshotDataUrl =
  'data:image/jpeg;base64,' +
  fs.readFileSync(path.join(__dirname, '../files/test.jpg')).toString('base64');

// A manual add through tRPC, as the web does it: player 7 on the Phoenix 2 chart 3
const addResult = (stats = { perfect: 90, great: 5, good: 3, bad: 1, miss: 1, combo: 95 }) =>
  req()
    .post('/trpc/results.addResultMutation')
    .set('session', addResultsSession)
    .send({
      json: {
        screenshot: screenshotDataUrl,
        fileName: 'test.jpg',
        playerId: 7,
        grade: 'S+',
        mix: 'Phoenix2',
        mod: '',
        score: getPhoenixScore(stats),
        ...stats,
        date: '2020-01-01',
        isExactDate: true,
        sharedChartId: 3,
        pass: true,
      },
    });

const getPlayerResults = (playerId: number) =>
  db
    .selectFrom('results')
    .select(['id', 'pp', 'exp', 'score_phoenix'])
    .where('player_id', '=', playerId)
    .orderBy('id')
    .execute();

const getPlayer = (playerId: number) =>
  db
    .selectFrom('players')
    .select(['pp', 'exp'])
    .where('id', '=', playerId)
    .executeTakeFirstOrThrow();

const getEvents = () => db.selectFrom('events').select(['id', 'type', 'payload']).execute();

const getCursor = async (consumer: string) =>
  (
    await db
      .selectFrom('event_cursors')
      .select('event_id')
      .where('consumer', '=', consumer)
      .executeTakeFirst()
  )?.event_id;

const setCursor = (consumer: string, eventId: number) =>
  db
    .insertInto('event_cursors')
    .values({ consumer, event_id: eventId, updated_at: sql`UTC_TIMESTAMP(3)` })
    .execute();

const insertEvent = (id: number, { secondsAgo = 0, type = 'resultAdded' } = {}) =>
  db
    .insertInto('events')
    .values({
      id,
      type,
      payload: JSON.stringify({ resultId: 0 }),
      created_at: sql`UTC_TIMESTAMP(3) - INTERVAL ${secondsAgo} SECOND`,
    })
    .execute();

// A consumer that records the ids it handles, and fails on the ids in `failingIds`
const createRecordingConsumer = (failingIds: number[] = []) => {
  const handled: number[] = [];
  const consumer = createEventConsumer('test', async (event: Event) => {
    handled.push(event.id);
    if (failingIds.includes(event.id)) {
      throw new Error(`Event ${event.id} fails`);
    }
  });
  return { handled, processBatch: consumer.processBatch };
};

const waitFor = async (description: string, check: () => Promise<boolean>) => {
  const deadline = Date.now() + 5000;
  while (!(await check())) {
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting until ${description}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
};

describe('Events', () => {
  describe('effects job, end to end', () => {
    let job: ReturnType<typeof startEffectsJob> | undefined;

    afterEach(async () => {
      await job?.stop();
      job = undefined;
    });

    it('applies the effects of a manually added result', async () => {
      job = startEffectsJob();

      await addResult().expect(200);

      await waitFor('the event is processed', async () => (await getCursor('effects')) === 1);
      const [result] = await getPlayerResults(7);
      const player = await getPlayer(7);
      assert.isAbove(result.pp!, 0, 'result pp');
      assert.isNotNull(result.exp, 'result exp');
      assert.strictEqual(player.pp, result.pp, 'player pp is the only result pp');
      assert.strictEqual(Number(player.exp), Number(result.exp), 'player exp is the result exp');
    });

    it('applies the effects of a result the Python ingestion reports', async () => {
      job = startEffectsJob();
      const [seeded] = await getPlayerResults(1);

      await req().post(`/results/result-added-effect/${seeded.id}`).expect(200);

      await waitFor('the event is processed', async () => (await getCursor('effects')) === 1);
      assert.isNotNull((await getPlayerResults(1))[0].exp, 'result exp');
      assert.isAbove((await getPlayerResults(1))[0].pp!, 0, 'result pp');
      assert.isNotNull((await getPlayer(1)).exp, 'player exp');
    });

    it('works through a backlog when it starts, giving pp only to the best result', async () => {
      await addResult({ perfect: 80, great: 20, good: 0, bad: 0, miss: 0, combo: 100 }).expect(200);
      await addResult({ perfect: 100, great: 0, good: 0, bad: 0, miss: 0, combo: 100 }).expect(200);
      await addEvent(db, 'resultAdded', { resultId: 999_999 });
      assert.lengthOf(await getEvents(), 3, 'three events are waiting');

      job = startEffectsJob();

      await waitFor('all events are processed', async () => (await getCursor('effects')) === 3);
      const [worse, better] = await getPlayerResults(7);
      assert.isNull(worse.pp, 'the worse result has no pp');
      assert.isAbove(better.pp!, 0, 'the better result has pp');
      assert.strictEqual((await getPlayer(7)).pp, better.pp, 'player pp is the best result pp');
      assert.isNotNull(worse.exp, 'both results have exp');
      assert.isNotNull(better.exp, 'both results have exp');
    });
  });

  describe('producers', () => {
    it('manual add stores the result with its score and one event, but not its effects', async () => {
      await addResult().expect(200);

      const [result] = await getPlayerResults(7);
      assert.deepEqual(await getEvents(), [
        { id: 1, type: 'resultAdded', payload: { resultId: result.id } },
      ]);
      assert.strictEqual(
        result.score_phoenix,
        getPhoenixScore({ perfect: 90, great: 5, good: 3, bad: 1, miss: 1, combo: 95 }),
        'score_phoenix is stored with the result'
      );
      assert.isNull(result.pp, 'no pp before the effects job runs');
      assert.isNull(result.exp, 'no exp before the effects job runs');
    });

    it('a rejected manual add stores neither a result nor an event', async () => {
      await addResult({ perfect: 1, great: 0, good: 0, bad: 0, miss: 0, combo: 1 }).expect(400);

      assert.isEmpty(await getPlayerResults(7));
      assert.isEmpty(await getEvents());
    });

    it('manual add stores no result when its event cannot be stored', async () => {
      await sql`rename table events to events_unavailable`.execute(db);
      try {
        await addResult().expect(500);
      } finally {
        await sql`rename table events_unavailable to events`.execute(db);
      }

      assert.isEmpty(await getPlayerResults(7), 'the result insert is rolled back');
    });

    it('the Python callback stores an event and applies nothing inline', async () => {
      const [seeded] = await getPlayerResults(1);

      await req().post(`/results/result-added-effect/${seeded.id}`).expect(200);

      assert.deepEqual(await getEvents(), [
        { id: 1, type: 'resultAdded', payload: { resultId: seeded.id } },
      ]);
      assert.isNull((await getPlayerResults(1))[0].exp);
    });
  });

  describe('effects consumer', () => {
    it('skips a result that was deleted before its event', async () => {
      await addEvent(db, 'resultAdded', { resultId: 999_999 });

      await applyEffects();

      assert.strictEqual(await getCursor('effects'), 1, 'the event counts as processed');
      assert.isEmpty(await db.selectFrom('event_failures').selectAll().execute(), 'no failure');
    });

    it('ignores event types it does not know', async () => {
      await insertEvent(1, { type: 'somethingNew' });

      await applyEffects();

      assert.strictEqual(await getCursor('effects'), 1);
    });
  });

  describe('consumer', () => {
    it('handles events in id order, once', async () => {
      const consumer = createRecordingConsumer();
      await insertEvent(1);
      await insertEvent(2);

      await consumer.processBatch();
      await insertEvent(3);
      await consumer.processBatch();

      assert.deepEqual(consumer.handled, [1, 2, 3]);
      assert.strictEqual(await getCursor('test'), 3);
    });

    it('waits for a missing id, until the event after it is old enough', async () => {
      const consumer = createRecordingConsumer();
      await insertEvent(1);
      await insertEvent(3);

      await consumer.processBatch();
      assert.deepEqual(consumer.handled, [1], 'stops before the gap');

      await db
        .updateTable('events')
        .set({ created_at: sql`UTC_TIMESTAMP(3) - INTERVAL 1 MINUTE` })
        .where('id', '=', 3)
        .execute();
      await consumer.processBatch();
      assert.deepEqual(consumer.handled, [1, 3], 'goes past the gap once it has timed out');
    });

    it('retries a failing event, then skips it after 5 attempts and records it', async () => {
      const consumer = createRecordingConsumer([1]);
      await insertEvent(1);
      await insertEvent(2);

      for (let i = 0; i < 4; i++) {
        await consumer.processBatch();
      }
      assert.deepEqual(consumer.handled, [1, 1, 1, 1], 'retries without moving on');
      assert.isUndefined(await getCursor('test'));
      assert.isEmpty(await db.selectFrom('event_failures').selectAll().execute());

      await consumer.processBatch();
      assert.deepEqual(consumer.handled, [1, 1, 1, 1, 1, 2], 'skips it on the 5th failure');
      assert.strictEqual(await getCursor('test'), 2);

      const failures = await db
        .selectFrom('event_failures')
        .select(['consumer', 'event_id', 'attempts', 'error'])
        .execute();
      assert.lengthOf(failures, 1);
      assert.include(failures[0], { consumer: 'test', event_id: 1, attempts: 5 });
      assert.include(failures[0].error, 'Event 1 fails');
    });
  });

  describe('deleteOldEvents', () => {
    const getEventIds = async () => (await getEvents()).map((event) => event.id);
    const dayInSeconds = 24 * 60 * 60;

    it('deletes only old events that every consumer has processed and none skipped', async () => {
      for (const id of [1, 2, 3, 4]) {
        await insertEvent(id, { secondsAgo: 40 * dayInSeconds });
      }
      await insertEvent(5);
      await setCursor('effects', 5);
      await setCursor('bot', 3);
      await db
        .insertInto('event_failures')
        .values({
          consumer: 'effects',
          event_id: 2,
          attempts: 5,
          error: '',
          failed_at: sql`UTC_TIMESTAMP(3)`,
        })
        .execute();

      await deleteOldEvents(30);

      // 1 and 3 are gone; 2 was skipped, 4 is ahead of the bot's cursor, 5 is recent
      assert.deepEqual(await getEventIds(), [2, 4, 5]);
    });

    it('deletes nothing while no consumer has a cursor', async () => {
      await insertEvent(1, { secondsAgo: 40 * dayInSeconds });

      await deleteOldEvents(30);

      assert.deepEqual(await getEventIds(), [1]);
    });
  });

  describe('resultAddedEffect', () => {
    it('gives the same outcome when it runs twice', async () => {
      const getState = async () => ({
        results: await db
          .selectFrom('results')
          .select(['id', 'pp', 'exp', 'score_phoenix', 'is_pass'])
          .orderBy('id')
          .execute(),
        players: await db.selectFrom('players').select(['id', 'pp', 'exp']).orderBy('id').execute(),
        ppHistory: await db.selectFrom('pp_history').select(['player_id', 'pp']).execute(),
      });
      const [seeded] = await getPlayerResults(2);

      await resultAddedEffect(seeded.id);
      const once = await getState();
      await resultAddedEffect(seeded.id);

      assert.deepEqual(await getState(), once);
    });
  });
});
