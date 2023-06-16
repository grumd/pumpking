import './envconfig';

import { createPool } from 'mysql2';
import { Kysely, MysqlDialect, Transaction as ITransaction } from 'kysely';
import type { DB } from './types/database';

const dialect = new MysqlDialect({
  pool: createPool({
    database:
      process.env.NODE_ENV === 'test' ? process.env.DB_DATABASE_TEST : process.env.DB_DATABASE,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
  }),
});

export const db = new Kysely<DB>({
  dialect,
});

export type Transaction = ITransaction<DB>;
