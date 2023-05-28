import { Knex } from 'knex';
import _ from 'lodash/fp';

import { mix } from 'constants/currentMix';
import chartDifficultyInterpolation from 'processors/chartDifficultyInterpolation';

const debug = require('debug')('backend-ts:migrations:interpolated_difficulty');

const TABLE = 'chart_instances';
const COLUMN = 'interpolated_difficulty';

export async function up(knex: Knex): Promise<void> {
  debug('Start');

  const difficultyBySharedChartId = await chartDifficultyInterpolation();

  debug('Calculated difficulties');

  if (!(await knex.schema.hasColumn(TABLE, COLUMN))) {
    await knex.schema.alterTable(TABLE, (table: Knex.TableBuilder) => {
      table.float(COLUMN);
    });
  }

  debug('Added new column');

  const queries = _.map(([sharedChartId, { difficulty }]) => {
    return knex(TABLE)
      .where('shared_chart', _.toNumber(sharedChartId))
      .where('mix', mix)
      .update(COLUMN, difficulty);
  }, _.toPairs(difficultyBySharedChartId));

  debug('Updating interpolated_difficulty column values');

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
}
