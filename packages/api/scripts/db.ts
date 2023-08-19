import { createPool } from 'mysql2';
import * as path from 'path';
import { Kysely, Migrator, MysqlDialect } from 'kysely';

import { MigrationProvider } from '../src/utils/MigrationProvider';

import * as dotenv from 'dotenv';

const { error } = dotenv.config({ path: path.join(__dirname, '../.env') });

if (error) {
  throw error;
}

const dialect = new MysqlDialect({
  pool: createPool({
    database:
      process.env.NODE_ENV === 'test' ? process.env.DB_DATABASE_TEST : process.env.DB_DATABASE,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
  }),
});

export const db = new Kysely<unknown>({
  dialect,
});

export const migrator = new Migrator({
  db,
  provider: new MigrationProvider({
    folder: path.join(__dirname, '../migrations'),
  }),
});
