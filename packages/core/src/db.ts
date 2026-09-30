import { createPool } from 'mysql2';
import { Kysely, MysqlDialect, Transaction as ITransaction } from 'kysely';
import type { DB } from './database';
import { requireEnv } from './env';

const dialect = new MysqlDialect({
  // Created on the first query, so a missing variable fails there with a clear error
  pool: async () =>
    createPool({
      database: requireEnv(process.env.NODE_ENV === 'test' ? 'DB_DATABASE_TEST' : 'DB_DATABASE'),
      user: requireEnv('DB_USERNAME'),
      password: requireEnv('DB_PASSWORD'),
    }),
});

export const db = new Kysely<DB>({
  dialect,
});

export type Transaction = ITransaction<DB>;
