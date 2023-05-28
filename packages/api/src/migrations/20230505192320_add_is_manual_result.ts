import { Knex } from 'knex';

const debug = require('debug')('backend-ts:migrations:add_is_manual_result');

export async function up(knex: Knex): Promise<void> {
  debug('Start');

  if (!(await knex.schema.hasColumn('results', 'is_manual_input'))) {
    await knex.schema.alterTable('results', (table: Knex.TableBuilder) => {
      table.boolean('is_manual_input').defaultTo(false);
    });
  }

  debug(`Added new ${'is_manual_input'} column`);
}

export async function down(knex: Knex): Promise<void> {
  debug('Rolling back');

  if (await knex.schema.hasColumn('results', 'is_manual_input')) {
    await knex.schema.alterTable('results', (table: Knex.TableBuilder) => {
      table.dropColumn('is_manual_input');
    });

    debug(`Removed column ${'is_manual_input'}`);
  } else {
    debug(`Column ${'is_manual_input'} doesnt exist`);
  }
}
