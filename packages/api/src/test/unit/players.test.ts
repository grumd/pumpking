// import createDebug from 'debug';
// const debug = createDebug('backend-ts:test:players');
import { assert } from 'chai';
import { db } from 'db';
import { getPlayersStats } from 'services/players/players';
import { req } from 'test/helpers';
import { getResultDefaults } from 'test/seeds/initialSeed';

describe('Players', () => {
  it('has players', async () => {
    const res = await req().get('/players/all').expect(200);

    assert.isNotEmpty(res.body, 'has some players in the list');
    Object.keys(res.body).forEach((key) => {
      assert.typeOf(res.body[key].nickname, 'string', 'nicknames should be strings');
    });
  });

  // TODO: calculate pp for all results before calling stats
  // mocked data doesn't have pp values
  it.skip('has players with stats', async () => {
    const res = await req().get('/players/stats').expect(200);

    assert.isNotEmpty(res.body, 'has some players in the list');
    Object.keys(res.body).forEach((key) => {
      assert.typeOf(res.body[key].nickname, 'string', 'nicknames should be strings');
      assert.typeOf(res.body[key].pp, 'number', 'pp values should be numbers');
    });
  });

  it('players have grade data', async () => {
    const res = await req().get('/players/1/grades').expect(200);

    assert.isNotEmpty(res.body.totalCounts, 'has counts for charts');
    assert.isNotEmpty(res.body.gradeCounts, 'has counts for player');
    assert.isNumber(res.body.totalCounts[0].level, 'level is a number');
    assert.isNumber(res.body.gradeCounts[0].level, 'level is a number');
    assert.isString(res.body.totalCounts[0].type, 'type is string');
    assert.isString(res.body.gradeCounts[0].type, 'type is string');
    assert.isNumber(res.body.totalCounts[0].level, 'count is a number');
    assert.isNumber(res.body.gradeCounts[0].level, 'count is a number');
    assert.isString(res.body.gradeCounts[0].grade, 'grade is a string');
  });

  it('derives the chart type from the label, not the type column', async () => {
    // The seeded S15 instance (chart 6) has a NULL type column
    await db
      .insertInto('results')
      .values({
        ...getResultDefaults({ playerId: 1, score: 900000 }),
        shared_chart: 6,
        chart_instance: 5,
        chart_label: 'S15',
      })
      .executeTakeFirstOrThrow();

    const res = await req().get('/players/1/grades').expect(200);
    const typeByLevel = Object.fromEntries(
      res.body.totalCounts.map((t: { level: number; type: string }) => [t.level, t.type])
    );
    assert.equal(typeByLevel[15], 'S', 'the NULL-type S15 chart is counted by its label');
  });

  it('lists all players with their latest arcade name', async () => {
    const res = await req().get('/players/all').expect(200);
    const arcadeNameById = Object.fromEntries(
      res.body.map((p: { id: number; arcade_name: string | null }) => [p.id, p.arcade_name])
    );
    assert.equal(arcadeNameById[1], 'DUMMY1', 'a player with one name gets that name');
    assert.equal(arcadeNameById[2], 'DUMMY2P2', 'the newest mix name (28) wins over 26');
    assert.equal(arcadeNameById[3], 'DUMMY3P', 'the newest mix name (27) wins over 26');
    assert.equal(arcadeNameById[4], 'DUMMY4', 'players without a newer name keep the older one');
  });

  it('does not duplicate players with arcade names in several mixes in the stats list', async () => {
    await db.updateTable('players').set({ pp: 100 }).where('id', '=', 2).execute();

    const stats = await getPlayersStats();
    const player2 = stats.filter((p) => p.id === 2);
    assert.lengthOf(player2, 1, 'player 2 appears once despite two arcade names');
    assert.equal(player2[0].arcade_name, 'DUMMY2P2', 'stats show the latest arcade name');
  });
});
