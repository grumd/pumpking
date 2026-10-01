import { app } from '../app';
import { getEvents, getResults, phoenixResult, post, screen } from './helpers';
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

const learnDave = async () => {
  await db.insertInto('players').values({ id: 7, nickname: 'Dave' }).execute();
  await db
    .insertInto('arcade_player_names')
    .values({ mix_id: 27, player_id: 7, name: 'DAVE', name_edist: 0 })
    .execute();
};

describe('Purgatory recheck', () => {
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

  it('answers no outcomes for an empty purgatory', async () => {
    assert.deepEqual((await recheck()).body, {
      outcomes: [],
      report: ['Rechecked 0 items in purgatory'],
    });
  });
});
