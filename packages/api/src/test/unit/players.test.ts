// import createDebug from 'debug';
// const debug = createDebug('backend-ts:test:players');
import { db } from '@pumpking/database/db';
import { assert } from 'chai';
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
    const level0 = res.body.totalCounts.filter((t: { level: number | null }) => t.level === 0);
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
    const insert = (gained: Date, extra: { is_hidden?: number; shared_chart?: number } = {}) =>
      db
        .insertInto('results')
        .values({ ...getResultDefaults({ playerId: 1 }), gained, ...extra })
        .executeTakeFirstOrThrow();
    await insert(day(2), { shared_chart: 3 });
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
    assert.include(items[0], { score: 1000000, is_pass: false });
    assert.equal(nextCursor, 2, 'a full page has a next one');

    const lastPage = output(
      await trpcQuery('players.latestResults', { playerId: 1, pageSize: 100 }).expect(200)
    );
    assert.isNull(lastPage.nextCursor, 'a short page is the last one');
  });

  describe('pp lists', () => {
    const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);

    // Chart 1: an old 100pp result. Chart 3 (rated 20.4): a recent 60pp result
    const insertPpResults = async () => {
      await db
        .updateTable('shared_charts')
        .set({ interpolated_difficulty: 20.4 })
        .where('id', '=', 3)
        .execute();
      await db
        .insertInto('results')
        .values([
          { ...getResultDefaults({ playerId: 1 }), pp: 100, gained: daysAgo(365 * 6) },
          { ...getResultDefaults({ playerId: 1 }), pp: 40, gained: daysAgo(10) },
          {
            ...getResultDefaults({ playerId: 1 }),
            score_phoenix: 950000,
            pp: 60,
            gained: daysAgo(10),
            shared_chart: 3,
            chart_instance: 3,
          },
        ])
        .execute();
    };

    // Chart 1 has no difficulty yet: its pp comes from the instance's level, 20
    const chart1Steps = { chartLevel: 20, maxPp: 20 ** 2.4 / 13, scoreFactor: 1 };
    // Chart 3 is rated 20.4, and 950k is ((0.95 - 0.5) / 0.5)² = 81% of its max pp
    const chart3Steps = { chartLevel: 20.4, maxPp: 20.4 ** 2.4 / 13, scoreFactor: 0.81 };
    const assertSteps = (
      steps: { chartLevel: number; maxPp: number; scoreFactor: number; pp: number },
      expected: { chartLevel: number; maxPp: number; scoreFactor: number }
    ) => {
      assert.strictEqual(steps.chartLevel, expected.chartLevel);
      assert.closeTo(steps.maxPp, expected.maxPp, 1e-9);
      assert.closeTo(steps.scoreFactor, expected.scoreFactor, 1e-9);
      assert.closeTo(steps.pp, expected.maxPp * expected.scoreFactor, 1e-9);
    };

    it('lists all-time best by full pp, with the steps to it and the age factor', async () => {
      await insertPpResults();

      const { items, nextCursor } = output(
        await trpcQuery('players.highestPpCharts', { playerId: 1, pageSize: 1 }).expect(200)
      );
      assert.lengthOf(items, 1);
      assert.include(items[0], { shared_chart: 1, pp: 100, ageFactor: 0.25 });
      assertSteps(items[0].ppSteps, chart1Steps);
      assert.equal(nextCursor, 1, 'one more chart to show');

      const lastPage = output(
        await trpcQuery('players.highestPpCharts', { playerId: 1, pageSize: 2 }).expect(200)
      );
      assert.include(lastPage.items[1], { shared_chart: 3, ageFactor: 1 });
      assertSteps(lastPage.items[1].ppSteps, chart3Steps);
      assert.isNull(lastPage.nextCursor, 'every chart is listed');
    });

    it('lists current best by pp after the age factor, with the steps to it', async () => {
      await insertPpResults();

      const { items } = output(
        await trpcQuery('players.ppBreakdown', { playerId: 1, pageSize: 20 }).expect(200)
      );
      assert.deepEqual(
        items.map((x: { shared_chart: number }) => x.shared_chart),
        [3, 1]
      );
      assertSteps(items[0].ppSteps, chart3Steps);
      assert.include(items[1], { pp: 40, ageFactor: 1 }, 'the recent 40pp beats 25% of 100pp');
      assertSteps(items[1].ppSteps, chart1Steps);
    });
  });
});
