// import createDebug from 'debug';
// const debug = createDebug('backend-ts:test:players');
import { assert } from 'chai';
import { db } from '@pumpking/database/db';
import { getPlayersStats } from 'services/players/players';
import { req } from 'test/helpers';
import { output, trpcQuery } from 'test/helpers/trpc';
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

  it('reads the chart type from shared_charts.type, not the instance type column', async () => {
    // The seeded S15 instance (chart 6) has a NULL type column; the chart's type is 'S'
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
    assert.equal(
      typeByLevel[15],
      'S',
      'the NULL-instance-type S15 chart is counted by its shared chart type'
    );
  });

  it('excludes COOP charts from the grade stats', async () => {
    await db
      .insertInto('results')
      .values({
        ...getResultDefaults({ playerId: 1, score: 900000 }),
        shared_chart: 7,
        chart_instance: 7,
        chart_label: 'COOP2',
      })
      .executeTakeFirstOrThrow();

    const res = await req().get('/players/1/grades').expect(200);
    const types = [
      ...new Set(
        [...res.body.totalCounts, ...res.body.gradeCounts].map((t: { type: string }) => t.type)
      ),
    ];
    assert.isFalse(types.includes('COOP'), 'no COOP entries in the grade stats');
    const level0 = res.body.totalCounts.filter(
      (t: { level: number | null }) => t.level === 0
    );
    assert.isEmpty(level0, 'the level-0 COOP chart is not counted');
  });

  it('derives grades with the Phoenix 2 formula for all mixes', async () => {
    // 930k is AA under the Phoenix 2 formula; the old Phoenix formula would give AA+ there
    await db
      .insertInto('results')
      .values({
        ...getResultDefaults({ playerId: 1, score: 930000 }),
        shared_chart: 3,
        chart_instance: 3,
        chart_label: 'S20',
        mix: 28,
        mix_name: 'Phoenix2',
      })
      .executeTakeFirstOrThrow();

    const res = await req().get('/players/1/grades').expect(200);
    const grades = res.body.gradeCounts
      .filter((g: { level: number; type: string }) => g.level === 20 && g.type === 'S')
      .map((g: { grade: string }) => g.grade);
    assert.include(grades, 'AA', '930k is graded AA by the Phoenix 2 formula');
    assert.notInclude(grades, 'AA+', 'the old Phoenix formula band (925k-940k) is not used');
    assert.include(grades, 'SSS+', 'the seeded 1M result is still SSS+');
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

  it('lists latest results newest first, without hidden ones', async () => {
    const day = (n: number) => new Date(Date.UTC(2030, 0, n));
    const insert = (gained: Date, extra: { is_hidden?: number; shared_chart?: number; plate?: string } = {}) =>
      db
        .insertInto('results')
        .values({ ...getResultDefaults({ playerId: 1 }), gained, ...extra })
        .executeTakeFirstOrThrow();
    await insert(day(2), { shared_chart: 3, plate: 'UG' });
    await insert(day(3), { is_hidden: 1 });
    await insert(day(1));

    const res = await trpcQuery('players.latestResults', { playerId: 1, pageSize: 2 }).expect(200);
    const { items, nextCursor } = output(res);
    assert.deepEqual(
      items.map((x: { date: string; shared_chart: number }) => [x.date, x.shared_chart]),
      [
        [day(2).toISOString(), 3],
        [day(1).toISOString(), 1],
      ],
      'newest first, the hidden result is left out'
    );
    assert.include(items[0], {
      score: 1000000,
      score_phoenix: 1000000,
      plate: 'UG',
      is_pass: false,
      mix: 26,
      label_mix: 28,
    });
    assert.equal(nextCursor, 2);
  });
});
