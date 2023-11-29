import { db } from 'db';
import createDebug from 'debug';
import { sql } from 'kysely';
import _ from 'lodash/fp';
import regression from 'regression';
import { DataPoint } from 'regression';
import { getSinglePlayerTotalPp } from 'services/players/playersPp';
import { calculateResultsPp } from 'services/results/resultsPp';

const debug = createDebug('backend-ts:services:chart-difficulty');

type AccPoint = { level: number; scorePercent: number };

export const getInterpolatedDifficultyPerChartInstance = async () => {
  const bestResults = await db
    .with('ranked_results', (_db) => {
      return _db
        .selectFrom('results')
        .innerJoin('chart_instances', 'chart_instances.id', 'results.chart_instance')
        .innerJoin('players', 'players.id', 'results.player_id')
        .innerJoin('tracks', 'tracks.id', 'chart_instances.track')
        .select([
          'results.id',
          'results.mix',
          'score_phoenix',
          'results.shared_chart as shared_chart_id',
          'chart_instances.id as chart_instance_id',
          'player_id',
          'players.nickname',
          'chart_instances.level',
          'tracks.short_name as track_short_name',
          sql<number>`row_number() over (partition by results.chart_instance, results.player_id order by ${sql.ref(
            'score_phoenix'
          )} desc)`.as('score_rank'),
        ])
        .where('rank_mode', '=', 0)
        .where('score_phoenix', 'is not', null)
        .where('chart_label', 'not like', 'COOP%');
    })
    .selectFrom('ranked_results')
    .selectAll()
    .where('score_rank', '=', 1)
    .execute();

  const getAccuracyPercent = (result: (typeof bestResults)[0]) => {
    return result.score_phoenix ? result.score_phoenix / 10_000 : null;
  };

  /**
   * Recording accuracy of every player on different difficulty levels
   */
  let profiles: Record<number, { accuracyPointsRaw: AccPoint[]; nickname: string }> = {};
  _.forEach((result) => {
    if (!result.score_phoenix || !result.player_id || !result.level) {
      return;
    }

    const percents = getAccuracyPercent(result)!;

    profiles[result.player_id] ??= {
      nickname: result.nickname,
      accuracyPointsRaw: [],
    };

    profiles[result.player_id].accuracyPointsRaw.push({
      level: result.level,
      scorePercent: percents,
    });
  }, bestResults);

  /**
   * Interpolating player's accuracy using logarithmic interpolation
   */
  profiles = _.pickBy((profile) => profile.accuracyPointsRaw.length > 50, profiles);

  const profilesInterpolated: Record<number, null | { pointsInterpolated: DataPoint[] }> =
    _.mapValues((profile) => {
      const maxScorePercent = _.maxBy(
        ({ scorePercent }) => scorePercent,
        profile.accuracyPointsRaw
      )?.scorePercent;
      const maxLevelWithMaxPercent = _.maxBy<AccPoint>(
        ({ level }) => level,
        _.filter(({ scorePercent }) => scorePercent === maxScorePercent, profile.accuracyPointsRaw)
      )?.level;
      if (!maxLevelWithMaxPercent || !maxScorePercent) {
        return null;
      }
      // Interpolating
      const points: DataPoint[] = profile.accuracyPointsRaw
        .filter(({ level }) => level >= maxLevelWithMaxPercent - 1)
        .map(({ level, scorePercent }) => [30 - level, 101 - scorePercent]);
      const regressed = regression.logarithmic(points);
      // Creating an interpolated function
      const f = (x: number): number => {
        const calculated = 101 - regressed.predict(30 - x)[1];
        return Math.max(0, Math.min(calculated, 100));
      };
      const yx: DataPoint[] = [];
      for (let x = 1; x <= 28; x += 0.1) {
        yx.push([x, f(x)]);
      }

      return { pointsInterpolated: yx };
    }, profiles);

  /**
   * Finding interpolated difficulty of every chart
   */
  const groupedBySharedChart = _.groupBy('shared_chart_id', bestResults);
  const groupedBySharedChartWithDiff = _.mapValues((chartResults) => {
    // Looping through every chart result to find weights
    const resultsData = chartResults
      .filter((r) => r.player_id && !!profiles[r.player_id])
      .map((r) => {
        if (!r.player_id || !r.level) return null;

        const profile = profilesInterpolated[r.player_id];
        const scorePercent = getAccuracyPercent(r);

        if (profile === null || scorePercent === null) {
          return null;
        }

        const interpolatedPoint = _.minBy(
          (pair) => Math.abs(pair[1] - scorePercent),
          profile.pointsInterpolated
        );

        if (interpolatedPoint === undefined) {
          return null;
        }

        const difficulty = interpolatedPoint[0];
        let weight =
          scorePercent > 98
            ? 1 - (scorePercent - 98) / (100 - 98)
            : scorePercent < 80
            ? Math.max(0, (scorePercent - 50) / (80 - 50))
            : 1;

        weight *= Math.min(1, Math.max(0.1, (8 - Math.abs(difficulty - r.level)) / 8));

        return { difficulty, weight, r };
      });

    const sums = resultsData.reduce(
      (acc, item) => {
        if (!item) {
          return acc;
        }
        return {
          diffSum: acc.diffSum + item.difficulty * item.weight,
          weightSum: acc.weightSum + item.weight,
        };
      },
      { diffSum: 0, weightSum: 0 }
    );

    // Using chart's built-in level as a contribution to the interpolated difficulty
    const latestMixResult = _.maxBy('mix', chartResults)!; // chartResults is not empty
    sums.diffSum += 2 * _.toNumber(latestMixResult.level);
    sums.weightSum += 2;

    return {
      sharedChartId: latestMixResult.shared_chart_id,
      chartInstances: _.uniq(chartResults.map((r) => r.chart_instance_id)),
      level: latestMixResult.level,
      name: latestMixResult.track_short_name,
      difficulty: sums.diffSum / sums.weightSum,
      affectedBy: resultsData
        .filter((res) => res)
        .map((res) => {
          return {
            player: res?.r.nickname,
            difficultyGuess: res?.difficulty,
            weight: res?.weight,
          };
        }),
    };
  }, groupedBySharedChart);

  const chartsGroupedByChartInstance: Record<
    number,
    { chartInstanceId: number } & Omit<
      (typeof groupedBySharedChartWithDiff)[number],
      'chartInstances'
    >
  > = {};

  for (const sharedChartId in groupedBySharedChartWithDiff) {
    const { chartInstances, ...chart } = groupedBySharedChartWithDiff[sharedChartId];
    for (const chartInstanceId of chartInstances) {
      chartsGroupedByChartInstance[chartInstanceId] = { ...chart, chartInstanceId };
    }
  }

  return chartsGroupedByChartInstance;
};

export const updateChartsDifficulty = async () => {
  debug('Recalculating charts difficulty');

  const interpolatedDiffs = await getInterpolatedDifficultyPerChartInstance();

  const chartLevels = await db
    .selectFrom('chart_instances')
    .leftJoin('shared_charts', 'chart_instances.shared_chart', 'shared_charts.id')
    .leftJoin('tracks', 'chart_instances.track', 'tracks.id')
    .select([
      'chart_instances.id as chart_instance_id',
      'chart_instances.level',
      'chart_instances.mix',
      'tracks.full_name',
      'chart_instances.label',
    ])
    .where('mix', '>=', 25)
    .where('chart_instances.level', 'is not', null)
    .execute();

  const updateCharts = chartLevels
    .map((chart) => {
      return {
        ...chart,
        interpolated: interpolatedDiffs[chart.chart_instance_id]?.difficulty,
      };
    })
    .filter((ch) => ch.interpolated && ch.level);

  updateCharts.reduce(async (_acc, { chart_instance_id, interpolated }) => {
    await db
      .updateTable('chart_instances')
      .set({ interpolated_difficulty: interpolated })
      .where('id', '=', chart_instance_id)
      .execute();
  }, Promise.resolve());

  debug('Updated charts difficulty');

  const allResultsPp = await calculateResultsPp();
  const idPpPairs = Array.from(allResultsPp.entries()).map(([id, pp]) => ({ id, pp }));

  await db.transaction().execute(async (trx) => {
    await trx.schema.dropTable('temp_results_pp').ifExists().execute();
    await trx.schema
      .createTable('temp_results_pp')
      .temporary()
      .addColumn('id', 'integer', (col) => col.primaryKey())
      .addColumn('pp', 'float8')
      .execute();

    // Just for Typescript
    const tempDb = trx.withTables<{
      temp_results_pp: { id: number; pp: number | null };
    }>();

    await tempDb.insertInto('temp_results_pp').values(idPpPairs).execute();

    // Kysely doesn't support MySQL syntax for update-join-set, using raw SQL instead
    await sql`
      UPDATE results
      LEFT JOIN temp_results_pp ON results.id = temp_results_pp.id
      SET results.pp = temp_results_pp.pp
    `.execute(tempDb);
  });

  debug('Updated results pp successfully');

  const playerIds = await db.selectFrom('players').select('id').execute();

  playerIds.reduce(async (prev, { id }) => {
    await prev;
    const totalPp = await getSinglePlayerTotalPp(id);
    debug(`Updating player ${id} with total pp ${totalPp}`);
    await db.updateTable('players').set({ pp: totalPp }).where('id', '=', id).executeTakeFirst();
  }, Promise.resolve());

  debug('Updated players total pp successfully');
};
