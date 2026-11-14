import { db } from '@pumpking/database/db';
import { assert } from 'chai';
import { updateChartsInterpolatedDifficulty } from 'services/charts/chartDifficultyInterpolation';
import { getResultDefaults } from 'test/seeds/initialSeed';

const insertInstance = async (instance: {
  id: number;
  shared_chart: number;
  mix: number;
  label: string;
  level: number;
}) => {
  await db
    .insertInto('chart_instances')
    .values({
      track: 1,
      type: instance.label.startsWith('D') ? ('D' as const) : ('S' as const),
      max_total_steps: 100,
      min_total_steps: 100,
      ...instance,
    })
    .executeTakeFirstOrThrow();
};

const getSharedChartDifficulty = async (sharedChartId: number) =>
  (
    await db
      .selectFrom('shared_charts')
      .select('interpolated_difficulty')
      .where('id', '=', sharedChartId)
      .executeTakeFirstOrThrow()
  ).interpolated_difficulty;

describe('Shared chart interpolated difficulty', () => {
  it('writes one difficulty per shared chart', async () => {
    await insertInstance({ id: 11, shared_chart: 1, mix: 27, label: 'S20', level: 20 });

    const sharedCharts = await updateChartsInterpolatedDifficulty();

    assert.equal(sharedCharts, 1, 'only shared chart 1 has results');
    assert.equal(await getSharedChartDifficulty(1), 20);
    assert.equal(await getSharedChartDifficulty(3), null, 'shared chart 3 has no results');
    assert.equal(await getSharedChartDifficulty(7), null, 'COOP shared chart 7 has no results');
  });

  it('uses results from any mix', async () => {
    await insertInstance({ id: 14, shared_chart: 6, mix: 25, label: 'S19', level: 19 });
    await db
      .insertInto('results')
      .values({
        ...getResultDefaults({ playerId: 4, score: 900000 }),
        mix: 25,
        shared_chart: 6,
        chart_instance: 14,
      })
      .executeTakeFirstOrThrow();

    await updateChartsInterpolatedDifficulty();

    assert.equal(await getSharedChartDifficulty(6), 19);
  });

  it('overwrites an existing difficulty on a re-run', async () => {
    await db
      .updateTable('shared_charts')
      .set({ interpolated_difficulty: 99.5 })
      .where('id', '=', 1)
      .execute();

    await updateChartsInterpolatedDifficulty();

    assert.equal(await getSharedChartDifficulty(1), 20, 'replaced by the freshly computed value');
  });
});
