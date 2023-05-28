import { RootHookObject, AsyncFunc, Context } from 'mocha';
import knexCleaner from 'knex-cleaner';

import { knexEx } from 'db';
import { initialSeed } from 'test/seeds/initialSeed';
import { createTestDatabase, deleteTestDatabase } from 'test/testDatabaseUtils';

const beforeAll: AsyncFunc = async function (this: Context) {
  this.timeout(30000);
  await createTestDatabase();
};

const afterAll: AsyncFunc = async function (this: Context) {
  this.timeout(30000);
  await deleteTestDatabase();
};

const beforeEach: AsyncFunc = async function (this: Context) {
  await knexCleaner.clean(knexEx);
  await initialSeed();
};

const afterEach: AsyncFunc = async function (this: Context) {
  // do nothing for now
};

export const mochaHooks: RootHookObject = {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
};
