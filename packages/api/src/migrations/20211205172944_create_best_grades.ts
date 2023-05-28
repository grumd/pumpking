import type { Knex } from 'knex';
import _ from 'lodash/fp';

import { ResultGradeRow, getChartBestGrades } from 'utils/results';

const debug = require('debug')('backend-ts:migrations:create_best_grade');

const TABLE = 'results_best_grade';

export async function up(knex: Knex): Promise<void> {
  debug('Start');

  if (!(await knex.schema.hasTable(TABLE))) {
    await knex.schema.createTable(TABLE, (table: Knex.TableBuilder) => {
      table.integer('player_id').notNullable();
      table.integer('shared_chart_id').notNullable();
      table.integer('result_id').notNullable();

      table.foreign('player_id').references('id').inTable('players');
      table.foreign('shared_chart_id').references('id').inTable('shared_charts');
      table.foreign('result_id').references('id').inTable('results');

      table.unique(['player_id', 'shared_chart_id']);
    });
    debug('Added table', TABLE);
  } else {
    debug('Table already exists', TABLE);
  }

  const results: ResultGradeRow[] = await knex('results')
    .select('id', 'shared_chart as shared_chart_id', 'player_id', 'grade')
    .whereNotNull('grade');

  debug('Fetched all results from table "results"');

  const bestGradeResultsPerChart = getChartBestGrades(results);

  debug('Calculated which results have the best grade');

  const flatBestResults = _.sortBy('id', _.flatten(_.values(bestGradeResultsPerChart)));

  debug('Sorted by id');

  if (flatBestResults.length) {
    await knex(TABLE).insert(
      flatBestResults.map((res) => ({
        shared_chart_id: res.shared_chart_id,
        player_id: res.player_id,
        result_id: res.id,
      }))
    );
  }

  debug('Finished');
}

export async function down(knex: Knex): Promise<void> {
  debug('Rolling back');

  if (await knex.schema.hasTable(TABLE)) {
    await knex.schema.dropTable(TABLE);
    debug(`Removed table ${TABLE}`);
  } else {
    debug(`Table ${TABLE} doesnt exist`);
  }
}
