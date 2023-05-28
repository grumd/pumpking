import { Knex } from 'knex';

const debug = require('debug')('backend-ts:migrations:add_admin_role');

export async function up(knex: Knex): Promise<void> {
  debug('Start');

  if (!(await knex.schema.hasColumn('players', 'is_admin'))) {
    await knex.schema.alterTable('players', (table: Knex.TableBuilder) => {
      table.boolean('is_admin').defaultTo(false);
    });
  }

  debug(`Added new ${'is_admin'} column`);

  // Dino and grumd
  await knex('players').whereIn('id', [2, 6]).update('is_admin', true);

  debug('Set Dino and grumd as admins');
}

export async function down(knex: Knex): Promise<void> {
  debug('Rolling back');

  if (await knex.schema.hasColumn('players', 'is_admin')) {
    await knex.schema.alterTable('players', (table: Knex.TableBuilder) => {
      table.dropColumn('is_admin');
    });

    debug(`Removed column ${'is_admin'}`);
  } else {
    debug(`Column ${'is_admin'} doesnt exist`);
  }
}
