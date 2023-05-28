import type { Knex } from 'knex';
import _ from 'lodash/fp';

import type { ResultRow } from 'utils/results';
import { getChartBestResults } from 'utils/results';

const debug = require('debug')('backend-ts:migrations:create_best_results');

const TABLE_RANK = 'results_highest_score_rank';
const TABLE_NO_RANK = 'results_highest_score_no_rank';

export async function up(knex: Knex): Promise<void> {
  debug('Start');

  if (!(await knex.schema.hasTable(TABLE_RANK))) {
    await knex.schema.createTable(TABLE_RANK, (table: Knex.TableBuilder) => {
      table.integer('player_id').notNullable();
      table.integer('shared_chart_id').notNullable();
      table.integer('result_id').notNullable();

      table.foreign('player_id').references('id').inTable('players');
      table.foreign('shared_chart_id').references('id').inTable('shared_charts');
      table.foreign('result_id').references('id').inTable('results');

      table.unique(['player_id', 'shared_chart_id']);
    });
    debug('Added table', TABLE_RANK);
  } else {
    debug('Table already exists', TABLE_RANK);
  }

  if (!(await knex.schema.hasTable(TABLE_NO_RANK))) {
    await knex.schema.createTable(TABLE_NO_RANK, (table: Knex.TableBuilder) => {
      table.integer('player_id').notNullable();
      table.integer('shared_chart_id').notNullable();
      table.integer('result_id').notNullable();

      table.foreign('player_id').references('id').inTable('players');
      table.foreign('shared_chart_id').references('id').inTable('shared_charts');
      table.foreign('result_id').references('id').inTable('results');

      table.unique(['player_id', 'shared_chart_id']);
    });
    debug('Added table', TABLE_NO_RANK);
  } else {
    debug('Table already exists', TABLE_NO_RANK);
  }

  const noRankResults: ResultRow[] = await knex('results')
    .select('id', 'shared_chart as shared_chart_id', 'player_id')
    .where('rank_mode', 0)
    .orderBy('score_xx', 'desc');
  const noRankCharts = getChartBestResults(noRankResults);

  debug('Fetched all normal best results from table "results"');

  const rankResults: ResultRow[] = await knex('results')
    .select('id', 'shared_chart as shared_chart_id', 'player_id')
    .where('rank_mode', 1)
    .orderBy('score_xx', 'desc');
  const rankCharts = getChartBestResults(rankResults);

  debug('Fetched all rank results from table "results"');

  const bestResultsNoRank = _.sortBy('id', _.flatten(_.values(noRankCharts)));
  const bestResultsRank = _.sortBy('id', _.flatten(_.values(rankCharts)));
  debug('Sorted by id');

  const noRankQuery = bestResultsNoRank.length
    ? knex(TABLE_NO_RANK).insert(
        bestResultsNoRank.map((res) => ({
          shared_chart_id: res.shared_chart_id,
          player_id: res.player_id,
          result_id: res.id,
        }))
      )
    : null;
  const rankQuery = bestResultsRank.length
    ? knex(TABLE_RANK).insert(
        bestResultsRank.map((res) => ({
          shared_chart_id: res.shared_chart_id,
          player_id: res.player_id,
          result_id: res.id,
        }))
      )
    : null;

  return Promise.all([noRankQuery, rankQuery]).then(() => {
    debug('Finished');
  });
}

export async function down(knex: Knex): Promise<void> {
  debug('Rolling back');

  if (await knex.schema.hasTable(TABLE_NO_RANK)) {
    await knex.schema.dropTable(TABLE_NO_RANK);
    debug(`Removed table ${TABLE_NO_RANK}`);
  } else {
    debug(`Table ${TABLE_NO_RANK} doesnt exist`);
  }

  if (await knex.schema.hasTable(TABLE_RANK)) {
    await knex.schema.dropTable(TABLE_RANK);
    debug(`Removed table ${TABLE_RANK}`);
  } else {
    debug(`Table ${TABLE_RANK} doesnt exist`);
  }
}
