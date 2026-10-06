import { app } from '../app';
import {
  getEvents,
  getResults,
  phoenixResult,
  post,
  screen,
  withoutTable,
  xxResult,
  xxScreen,
} from './helpers';
import { seed } from './seed';
import { db } from '@pumpking/database/db';
import { assert } from 'chai';
import { sql } from 'kysely';
import request from 'supertest';

const recheck = (body: object = {}) =>
  request(app).post('/internal/purgatory/recheck').send(body).expect(200);

// A screen result of a player ingestion doesn't know yet: it goes to purgatory
const addUnknownPlayer = async (result: object = {}) => {
  const res = await post(
    '/results/screen/submit',
    screen({ result: { ...phoenixResult(), player_name: 'DAVE', ...result } })
  );
  return res.body.updates[0].id as number;
};

// A naive datetime, written as it is
const naive = (dateTime: string) => sql<Date>`${dateTime}`;

const learnDave = async (mixId = 27) => {
  await db.insertInto('players').values({ id: 7, nickname: 'Dave' }).execute();
  await db
    .insertInto('arcade_player_names')
    .values({ mix_id: mixId, player_id: 7, name: 'DAVE', name_edist: 0 })
    .execute();
};

describe('Purgatory recheck', () => {
  beforeEach(seed);

  it('moves a row that is valid now to results, keeping when it was added', async () => {
    const id = await addUnknownPlayer();
    // Added an hour ago
    await db
      .updateTable('purgatory')
      .set({ added: sql`UTC_TIMESTAMP() - INTERVAL 1 HOUR` })
      .execute();
    const [{ added }] = await db
      .selectFrom('purgatory')
      .select(sql<string>`CAST(added AS CHAR)`.as('added'))
      .execute();
    await learnDave();

    const res = await recheck({ id });
    assert.deepEqual(res.body.outcomes, [{ id, outcome: 'added', status: 'result added' }]);
    assert.include(res.body.report, "Result operation: 'result added'");
    assert.equal(res.body.report.at(-1), 'Rechecked 1 items in purgatory');

    assert.lengthOf(await db.selectFrom('purgatory').select('id').execute(), 0);
    const [result] = await getResults();
    assert.include(result, { player_name: 'DAVE', recognized_player_id: 7, added });
    const events = await getEvents();
    assert.deepEqual(
      events.map((e) => [e.type, e.payload]),
      [['resultAdded', { resultId: result.id }]]
    );
  });

  it('rechecks everything: rows stay with their new reason, are discarded or move', async () => {
    const stays = await addUnknownPlayer({ player_name: 'ZED' });
    const discarded = await addUnknownPlayer();
    const valid = await addUnknownPlayer();
    await db.updateTable('purgatory').set({ reason: 'Old reason' }).execute();
    await db.updateTable('purgatory').set({ score: 0 }).where('id', '=', discarded).execute();
    await learnDave();

    const res = await recheck();
    const reason = 'Unknown player ZED for mix Phoenix, closest is BOB with 3 edits';
    assert.deepEqual(res.body.outcomes, [
      { id: stays, outcome: 'stays', reason, reasonChanged: true },
      { id: discarded, outcome: 'discarded', reason: 'Empty score, not needed' },
      { id: valid, outcome: 'added', status: 'result added' },
    ]);
    assert.equal(res.body.report[0], `Rechecking items IDs [${stays}..${valid}]`);
    assert.deepEqual(await db.selectFrom('purgatory').select(['id', 'reason']).execute(), [
      { id: stays, reason },
    ]);

    const again = await recheck({ id: stays });
    assert.deepEqual(again.body.outcomes, [
      { id: stays, outcome: 'stays', reason, reasonChanged: false },
    ]);
  });

  it('rechecks rows whose date is only known roughly, and without mods', async () => {
    // Rows from an import: only the day is known, the play was before its end
    const sameDay = await addUnknownPlayer();
    const dayBefore = await addUnknownPlayer();
    await db
      .updateTable('purgatory')
      .set({ exact_gain_date: 0, mods_list: null, gained: naive('2026-09-30 23:59:59') })
      .execute();
    await db
      .updateTable('purgatory')
      .set({ gained: naive('2026-09-29 23:59:59') })
      .where('id', '=', dayBefore)
      .execute();
    await learnDave();
    // The arcade's screen of the play, with its exact time
    await post(
      '/results/screen/submit',
      screen({ result: { ...phoenixResult(), player_name: 'DAVE' } })
    );
    const [detailed] = await getResults();

    const res = await recheck();
    assert.deepEqual(res.body.outcomes, [
      {
        id: sameDay,
        outcome: 'added',
        status: `detailed result #${detailed.id} is up-to-date`,
      },
      // The play the screen shows was after this day: another play
      { id: dayBefore, outcome: 'added', status: 'result added' },
    ]);
    const results = await getResults();
    assert.deepEqual(
      results.map((r) => [r.exact_gain_date, r.gained, r.mods_list]),
      [
        [1, '2026-09-30 20:12:25', 'AV500 BGADARK'],
        [0, '2026-09-29 23:59:59', null],
      ]
    );
  });

  it('rechecks an XX row without a grade or mods, which old imports have', async () => {
    const res = await post(
      '/results/screen/submit',
      xxScreen({ ...xxResult(), player_name: 'DAVE' })
    );
    const { id } = res.body.updates[0];
    await db
      .updateTable('purgatory')
      .set({ exact_gain_date: 0, mods_list: null, grade: null, is_pass: null })
      .execute();
    await learnDave(26);

    assert.deepEqual((await recheck({ id })).body.outcomes, [
      { id, outcome: 'added', status: 'result added' },
    ]);
    const [result] = await getResults();
    // Validated as an unknown grade, stored as it was
    assert.include(result, { grade: null, mods_list: null, rank_mode: 0, recognized_player_id: 7 });
  });

  it("skips a Phoenix score's check against the stats when asked, and only then", async () => {
    // XX scores, which only have a minimum, are still checked
    const phoenix = await addUnknownPlayer({ score: 991_000, score_increase: 991_000 });
    const res = await post(
      '/results/screen/submit',
      xxScreen({ ...xxResult(), player_name: 'DAVE', score: 100_000 })
    );
    const xx = res.body.updates[0].id as number;
    await learnDave();
    await db
      .insertInto('arcade_player_names')
      .values({ mix_id: 26, player_id: 7, name: 'DAVE', name_edist: 0 })
      .execute();

    assert.deepEqual((await recheck()).body.outcomes, [
      {
        id: phoenix,
        outcome: 'stays',
        reason: 'Invalid score 991,000 for specified stats, should be ~ 991,925',
        reasonChanged: true,
      },
      {
        id: xx,
        outcome: 'stays',
        reason: 'Invalid score: 100,000 is too low for stats specified',
        reasonChanged: true,
      },
    ]);
    assert.deepEqual((await recheck({ skipScoreCheck: true })).body.outcomes, [
      { id: phoenix, outcome: 'added', status: 'result added' },
      {
        id: xx,
        outcome: 'stays',
        reason: 'Invalid score: 100,000 is too low for stats specified',
        reasonChanged: false,
      },
    ]);
    const results = await getResults();
    assert.deepEqual(
      results.map((r) => r.score),
      [991_000]
    );
  });

  it('answers 500 when the database fails', async () => {
    await addUnknownPlayer();
    await withoutTable('arcade_player_names', async () => {
      const res = await request(app).post('/internal/purgatory/recheck').send({}).expect(500);
      assert.match(res.body.error, /arcade_player_names.* doesn't exist/);
    });
  });

  it('answers no outcomes for an empty purgatory', async () => {
    assert.deepEqual((await recheck()).body, {
      outcomes: [],
      report: ['Rechecked 0 items in purgatory'],
    });
  });
});
