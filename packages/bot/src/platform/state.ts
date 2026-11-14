import { db } from '@pumpking/database/db';
import { sql } from 'kysely';

export const getState = async <T>(plugin: string, key: string): Promise<T | undefined> => {
  const row = await db
    .selectFrom('bot_state')
    .select('value')
    .where('plugin', '=', plugin)
    .where('key', '=', key)
    .executeTakeFirst();
  return row ? (row.value as T) : undefined;
};

export const setState = async (plugin: string, key: string, value: unknown) => {
  const json = JSON.stringify(value);
  await db
    .insertInto('bot_state')
    .values({ plugin, key, value: json, updated_at: sql`UTC_TIMESTAMP(3)` })
    .onDuplicateKeyUpdate({ value: json, updated_at: sql`UTC_TIMESTAMP(3)` })
    .execute();
};
