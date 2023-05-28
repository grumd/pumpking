const exec = require('child_process').exec;
require('dotenv').config({ path: '.env' });
const debug = require('debug')('backend-ts:test:database-setup');

// import { initialSeed } from './seeds/initialSeed';

const runCommand = (command: string): Promise<string> => {
  return new Promise((res, rej) => {
    exec(command, (err: string, stdout: string, stderr?: string) => {
      if (err) {
        debug(err);
        rej(new Error(err));
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

const { DB_DATABASE_TEST, DB_USERNAME, DB_PASSWORD, DB_DATABASE } = process.env;

export const createTestDatabase = async () => {
  debug('Creating test database');
  await runCommand(
    `mysqladmin create ${DB_DATABASE_TEST} -u ${DB_USERNAME} --password=${DB_PASSWORD} && mysqldump --no-data -u ${DB_USERNAME} --password=${DB_PASSWORD} ${DB_DATABASE} | mysql -u ${DB_USERNAME} --password=${DB_PASSWORD} ${DB_DATABASE_TEST}`
  );
};

export const deleteTestDatabase = async () => {
  debug('Deleting test database');
  // return;
  await runCommand(
    `mysqladmin drop ${DB_DATABASE_TEST} -u ${DB_USERNAME} --password=${DB_PASSWORD} -f`
  );
};
