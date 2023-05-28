import { Knex } from 'knex';

const debug = require('debug')('backend-ts:migrations:can_add_results_manually');

export async function up(knex: Knex): Promise<void> {
  debug('Start');

  if (!(await knex.schema.hasColumn('players', 'can_add_results_manually'))) {
    await knex.schema.alterTable('players', (table: Knex.TableBuilder) => {
      table.boolean('can_add_results_manually').defaultTo(false);
    });
  }

  debug(`Added new ${'can_add_results_manually'} column`);

  await knex('players').where('is_admin', true).update('can_add_results_manually', true);

  debug('Allow admins to add results');
}

export async function down(knex: Knex): Promise<void> {
  debug('Rolling back');

  if (await knex.schema.hasColumn('players', 'can_add_results_manually')) {
    await knex.schema.alterTable('players', (table: Knex.TableBuilder) => {
      table.dropColumn('can_add_results_manually');
    });

    debug(`Removed column ${'can_add_results_manually'}`);
  } else {
    debug(`Column ${'can_add_results_manually'} doesnt exist`);
  }
}
