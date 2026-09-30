import { db } from './db';
import { sql } from 'kysely';

/** The DB half of every service's /healthz: throws when the database can't answer */
export const pingDb = async (): Promise<void> => {
  await sql`select 1`.execute(db);
};
