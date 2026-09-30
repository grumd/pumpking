import { assert } from 'chai';
import { db } from '@pumpking/core/db';
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

  it('excludes rank mode (VJ) results which have no phoenix score', async () => {
    await db
      .insertInto('results')
      .values({
        ...getResultDefaults({ playerId: 4, score: 999900 }),
        rank_mode: 1,
        score_phoenix: null,
      })
      .executeTakeFirstOrThrow();

    const items = await searchCharts({ limit: 10, offset: 0 });
    assert.deepEqual(
      items[0].results.map((r) => r.playerId),
      [1, 2, 3],
      'VJ result is not in the leaderboard'
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
