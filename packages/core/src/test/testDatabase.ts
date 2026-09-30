import { exec, type ExecException } from 'child_process';

import createDebug from 'debug';
const debug = createDebug('backend-ts:test:database-setup');

import { db } from '../db';
import { requireEnv } from '../env';
import { createMigrator, migrateToLatest } from '../migrator';

const runCommand = (command: string): Promise<string> => {
  return new Promise((res, rej) => {
    exec(command, (err: ExecException | null, stdout: string, stderr?: string) => {
      if (err) {
        debug(err);
        rej(err);
      } else if (typeof stderr !== 'string') {
        debug(stderr);
        rej(new Error(stderr));
      } else {
        debug(stdout);
        res(stdout);
      }
    });
  });
};

const mysql = (query: string) =>
  runCommand(
    `mysql -u ${requireEnv('DB_USERNAME')} --password=${requireEnv('DB_PASSWORD')} -e "${query}"`
  );

export const createTestDatabase = async () => {
  const DB_DATABASE_TEST = requireEnv('DB_DATABASE_TEST');
  debug('Creating test database');
  await mysql(`DROP DATABASE IF EXISTS ${DB_DATABASE_TEST}`);
  await mysql(`CREATE DATABASE ${DB_DATABASE_TEST}`);
  debug('Migrating test database');
  await migrateToLatest(createMigrator(db));
};

export const deleteTestDatabase = async () => {
  const DB_DATABASE_TEST = requireEnv('DB_DATABASE_TEST');
  debug('Deleting test database');
  await mysql(`DROP DATABASE IF EXISTS ${DB_DATABASE_TEST}`);
};
