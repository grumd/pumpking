import { Knex } from 'knex';

const debug = require('debug')('backend-ts:migrations:sessions_foreign_key');

export async function up(knex: Knex): Promise<void> {
  debug('Start');

  await knex.schema.alterTable('sessions', (table: Knex.TableBuilder) => {
    table.foreign('player').references('id').inTable('players');
  });

  debug('Added foreign key to sessions table');
}

export async function down(knex: Knex): Promise<void> {
  debug('Rolling back');

  await knex.schema.alterTable('sessions', (table: Knex.TableBuilder) => {
    table.dropForeign('player');
  });

  debug(`Removed foreign key from sessions`);
}
