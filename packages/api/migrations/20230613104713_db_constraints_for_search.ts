import { Kysely } from 'kysely';

/*
 * From Kysely docs:
 * The only argument for the functions is an instance of Kysely<any>.
 * It's important to use Kysely<any> and not Kysely<YourDatabase>.
 * Migrations should never depend on the current code of your app
 * because they need to work even when the app changes.
 * Migrations need to be "frozen in time".
 */

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('chart_instances')
    .addUniqueConstraint('unique_mix_shared_chart', ['mix', 'shared_chart'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('chart_instances').dropConstraint('unique_mix_shared_chart').execute();
}
