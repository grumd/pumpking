import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('players')
    .addColumn('openai_prompt_tokens', 'integer', (col) => col.notNull().defaultTo(0))
    .execute();

  await db.schema
    .alterTable('players')
    .addColumn('openai_completion_tokens', 'integer', (col) => col.notNull().defaultTo(0))
    .execute();

  // Add generated column for cost calculation
  // $0.25 per 1M input tokens + $2.00 per 1M output tokens
  await sql`
    ALTER TABLE players
    ADD COLUMN openai_cost DECIMAL(10, 6) AS (
      openai_prompt_tokens * 0.00000025 + openai_completion_tokens * 0.000002
    ) STORED
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('players').dropColumn('openai_cost').execute();
  await db.schema.alterTable('players').dropColumn('openai_prompt_tokens').execute();
  await db.schema.alterTable('players').dropColumn('openai_completion_tokens').execute();
}
