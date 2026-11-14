import { db } from './db';
import { sql } from 'kysely';

export const pingDb = async (): Promise<void> => {
  await sql`select 1`.execute(db);
};
