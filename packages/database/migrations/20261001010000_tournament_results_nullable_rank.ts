import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('tournament_results').modifyColumn('rank', 'int').execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('tournament_results')
    .modifyColumn('rank', 'int', (col) => col.notNull())
    .execute();
}
