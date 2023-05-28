import { Knex } from 'knex';
import { knex } from 'db';
import _ from 'lodash/fp';

import { Result } from 'models/Result';
import { mix } from 'constants/currentMix';

import {
  getGroupedBestResults,
  getAccuracyPercent,
  getScoreWithoutBonus,
  getMaxScoreCandidate,
} from 'utils/results';

const debug = require('debug')('backend-ts:migrations:initialize_pp');

const TABLE = 'results';
const TABLE_CHARTS = 'shared_charts';
const COLUMN = 'pp';
const COLUMN_CHART_PP = 'max_pp';

// This is the old way which didn't use the new 'result_highest_score_no_rank' table
// Used by the old migrations still
const calculateResultsPpOld = async (sharedChartId?: number | null) => {
  let query = knex
    .query(Result)
    .innerJoinColumn('shared_chart')
    .innerJoinColumn('chart_instance')
    .innerJoinColumn('player')
    .select(
      'id',
      'score_xx',
      'grade',
      'perfects',
      'greats',
      'goods',
      'bads',
      'misses',
      'shared_chart.id',
      'player.id',
      'chart_instance.level',
      'chart_instance.interpolated_difficulty'
    )
    .where('player.hidden', 0)
    .where('rank_mode', 0)
    .where('is_new_best_score', 1)
    .where('mix', mix)
    .where('chart_label', 'NOT LIKE', 'COOP%')
    .orderBy('gained', 'desc');

  if (sharedChartId) {
    query = query.where('shared_chart.id', sharedChartId);
  }

  const allResults = await query.getMany();

  const sharedCharts = getGroupedBestResults(allResults);

  const resultPpMap = new Map<number, number>();
  const chartPpMap = new Map<number, number>();

  for (const chartId in sharedCharts) {
    const results = sharedCharts[chartId].map((result) => {
      const accuracy = getAccuracyPercent(result);
      const scoreRaw = getScoreWithoutBonus(result.score_xx, result.grade);
      return {
        ...result,
        scoreRaw,
        accuracy,
        maxScoreCandidate: getMaxScoreCandidate(scoreRaw, accuracy, false),
      };
    });

    const chartLevel =
      results[0].chart_instance.interpolated_difficulty || results[0].chart_instance.level;
    const maxPP = chartLevel ** 2.2 / 7.6;
    chartPpMap.set(_.toNumber(chartId), maxPP);

    let maxScore = 0;

    for (const result of results) {
      if (maxScore < result.maxScoreCandidate) {
        maxScore = result.maxScoreCandidate;
      }
    }
    if (maxScore > 0) {
      for (const result of results) {
        const K = Math.max(0, Math.min(1, result.scoreRaw / maxScore - 0.3) / 0.7);
        const pp = K * maxPP;
        resultPpMap.set(result.id, pp);
      }
    }
  }
  return {
    results: resultPpMap,
    charts: chartPpMap,
  };
};

export async function up(knex: Knex): Promise<void> {
  debug('Start');

  const { results, charts } = await calculateResultsPpOld();

  debug('Calculated pp for all results');

  if (!(await knex.schema.hasColumn(TABLE, COLUMN))) {
    await knex.schema.alterTable(TABLE, (table: Knex.TableBuilder) => {
      table.float(COLUMN);
    });
  }

  debug('Added new pp column');

  if (!(await knex.schema.hasColumn(TABLE_CHARTS, COLUMN_CHART_PP))) {
    await knex.schema.alterTable(TABLE_CHARTS, (table: Knex.TableBuilder) => {
      table.float(COLUMN_CHART_PP);
    });
  }

  debug('Added new pp column for charts');

  const queries: Knex.QueryBuilder<Result, number>[] = [];
  results.forEach((pp, resultId) => {
    queries.push(knex(TABLE).where('id', resultId).update(COLUMN, pp));
  });
  charts.forEach((pp, chartId) => {
    queries.push(knex(TABLE_CHARTS).where('id', chartId).update(COLUMN_CHART_PP, pp));
  });

  debug('Updating pp column values');

  return Promise.all(queries).then(() => {
    debug('Finished');
  });
}

export async function down(knex: Knex): Promise<void> {
  debug('Rolling back');

  if (await knex.schema.hasColumn(TABLE, COLUMN)) {
    await knex.schema.alterTable(TABLE, (table: Knex.TableBuilder) => {
      table.dropColumn(COLUMN);
    });

    debug(`Removed column ${COLUMN}`);
  } else {
    debug(`Column ${COLUMN} doesnt exist`);
  }

  if (await knex.schema.hasColumn(TABLE_CHARTS, COLUMN_CHART_PP)) {
    await knex.schema.alterTable(TABLE_CHARTS, (table: Knex.TableBuilder) => {
      table.dropColumn(COLUMN_CHART_PP);
    });

    debug(`Removed column ${COLUMN_CHART_PP}`);
  } else {
    debug(`Column ${COLUMN_CHART_PP} doesnt exist`);
  }
}
