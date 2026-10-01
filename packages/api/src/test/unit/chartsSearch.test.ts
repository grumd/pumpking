import { db } from '@pumpking/database/db';
import { assert } from 'chai';
import { searchCharts } from 'services/charts/chartsSearch';
import { getResultDefaults } from 'test/seeds/initialSeed';

describe('Charts search (Phoenix scoring only)', () => {
  it('returns phoenix scores for the seeded chart', async () => {
    const items = await searchCharts({ limit: 10, offset: 0 });
    assert.lengthOf(items, 1, 'seeded chart is returned');
    assert.deepEqual(
      items[0].results.map((r) => r.score),
      [1000000, 800000, 700000],
      'scores are sorted by score_phoenix desc'
    );
  });

  it('includes the original score, which differs for pre-Phoenix results', async () => {
    // XX-scale original score (1.8M) back-calculated to Phoenix (1M)
    await db
      .insertInto('results')
      .values({
        ...getResultDefaults({ playerId: 4, score: 2269600 }),
        score_phoenix: 997964,
      })
      .executeTakeFirstOrThrow();

    const items = await searchCharts({ limit: 10, offset: 0 });
    const results = items[0].results;
    assert.deepEqual(
      results.map((r) => r.score),
      [1000000, 997964, 800000, 700000],
      'ranking uses the phoenix score, not the original one'
    );
    assert.equal(results[1].playerId, 4);
    assert.equal(results[1].originalScore, 2269600, 'original score is returned for XX results');
    assert.equal(results[0].originalScore, 1000000, 'original score matches for equal values');
  });

  it('ranks rank mode (VJ) results by their phoenix score, like the others', async () => {
    await db
      .insertInto('results')
      .values({
        ...getResultDefaults({ playerId: 4, score: 999900 }),
        rank_mode: 1,
        score_phoenix: 900000,
      })
      .executeTakeFirstOrThrow();

    const items = await searchCharts({ limit: 10, offset: 0 });
    assert.deepEqual(
      items[0].results.map((r) => r.playerId),
      [1, 4, 2, 3],
      'VJ result is ranked by its phoenix score'
    );
  });

  it('excludes results which have no phoenix score', async () => {
    await db
      .insertInto('results')
      .values({
        ...getResultDefaults({ playerId: 4, score: 999900 }),
        score_phoenix: null,
      })
      .executeTakeFirstOrThrow();

    const items = await searchCharts({ limit: 10, offset: 0 });
    assert.deepEqual(
      items[0].results.map((r) => r.playerId),
      [1, 2, 3],
      'the result without a phoenix score is not in the leaderboard'
    );
  });

  it('filters half-double (HD) charts by the HD label', async () => {
    await db
      .insertInto('results')
      .values({
        ...getResultDefaults({ playerId: 1, score: 900000 }),
        shared_chart: 4,
        chart_instance: 4,
        mix: 28,
        mix_name: 'Phoenix2',
        chart_label: 'HD18',
      })
      .executeTakeFirstOrThrow();

    const hdItems = await searchCharts({ limit: 10, offset: 0, labels: ['HD'] });
    assert.lengthOf(hdItems, 1, 'only the HD chart matches the HD label');
    assert.equal(hdItems[0].label, 'HD18');
    assert.equal(hdItems[0].level, 18);

    const sItems = await searchCharts({ limit: 10, offset: 0, labels: ['S'] });
    assert.lengthOf(sItems, 1, 'the HD chart does not leak into the S label');
    assert.equal(sItems[0].label, 'S20');
  });

  describe('sorting by last played date', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    twoDaysAgo.setMilliseconds(0);

    beforeEach(async () => {
      // Chart 1 was last played two days ago, chart 6 yesterday
      await db
        .updateTable('results')
        .set({ added: twoDaysAgo, gained: twoDaysAgo })
        .where('shared_chart', '=', 1)
        .execute();
      await db
        .insertInto('results')
        .values({
          ...getResultDefaults({ playerId: 2, score: 900000 }),
          shared_chart: 6,
          chart_instance: 5,
          added: yesterday,
          gained: yesterday,
        })
        .executeTakeFirstOrThrow();
    });

    it("doesn't move a chart up for a result that only ties the player's best score", async () => {
      const oldBest = await db
        .selectFrom('results')
        .select('id')
        .where('shared_chart', '=', 1)
        .where('player_id', '=', 1)
        .executeTakeFirstOrThrow();
      await db
        .insertInto('results')
        .values(getResultDefaults({ playerId: 1, score: 1000000 }))
        .executeTakeFirstOrThrow();

      const items = await searchCharts({ limit: 10, offset: 0 });
      assert.deepEqual(
        items.map((chart) => chart.id),
        [6, 1],
        'chart 1 stays below the chart that was played after it'
      );
      assert.equal(items[1].updatedOn.getTime(), twoDaysAgo.getTime(), 'the old best date');
      assert.equal(items[1].results[0].id, oldBest.id, 'the old best result is shown');
    });

    it('moves a chart up for a new best score', async () => {
      await db
        .insertInto('results')
        .values(getResultDefaults({ playerId: 1, score: 1000000 }))
        .executeTakeFirstOrThrow();
      await db
        .insertInto('results')
        .values(getResultDefaults({ playerId: 3, score: 750000 }))
        .executeTakeFirstOrThrow();

      const items = await searchCharts({ limit: 10, offset: 0 });
      assert.deepEqual(items.map((chart) => chart.id), [1, 6]);
    });
  });

  it('single chart query also uses phoenix scoring', async () => {
    await db
      .insertInto('results')
      .values({
        ...getResultDefaults({ playerId: 4, score: 1489300 }),
        score_phoenix: 850000,
      })
      .executeTakeFirstOrThrow();

    const items = await searchCharts({ limit: 10, offset: 0, sharedChartId: 1 });
    assert.lengthOf(items, 1);
    assert.deepEqual(
      items[0].results.map((r) => r.score),
      [1000000, 850000, 800000, 700000]
    );
    assert.equal(items[0].results[1].originalScore, 1489300);
  });
});
