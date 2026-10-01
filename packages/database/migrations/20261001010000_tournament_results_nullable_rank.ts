import { Kysely } from 'kysely';

/**
 * A player needs scores on at least 3 pool charts to get a place in a tournament; the
 * end job still freezes the scores of players with fewer, with no rank.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('tournament_results').modifyColumn('rank', 'int').execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('tournament_results')
    .modifyColumn('rank', 'int', (col) => col.notNull())
    .execute();
}
