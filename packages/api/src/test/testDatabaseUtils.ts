import { exec, type ExecException } from 'child_process';
import { config } from 'dotenv';

config({ path: '.env' });

import createDebug from 'debug';
const debug = createDebug('backend-ts:test:database-setup');

import { migrateToLatest } from './seeds/migration';

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

const { DB_DATABASE_TEST, DB_USERNAME, DB_PASSWORD } = process.env;

export const createTestDatabase = async () => {
  debug('Creating test database');
  await runCommand(
    `mysql -u ${DB_USERNAME} --password=${DB_PASSWORD} -e "DROP DATABASE IF EXISTS ${DB_DATABASE_TEST}"`
  );
  await runCommand(
    `mysql -u ${DB_USERNAME} --password=${DB_PASSWORD} -e "CREATE DATABASE ${DB_DATABASE_TEST}"`
  );
  debug('Migrating test database');
  await migrateToLatest();
};

export const deleteTestDatabase = async () => {
  debug('Deleting test database');
  await runCommand(
    `mysql -u ${DB_USERNAME} --password=${DB_PASSWORD} -e "DROP DATABASE IF EXISTS ${DB_DATABASE_TEST}"`
  );
};
