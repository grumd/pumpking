import { seed } from './seed';
import { createTestDatabase, deleteTestDatabase } from '@pumpking/database/test/testDatabase';
import type { AsyncFunc, Context, RootHookObject } from 'mocha';

const beforeAll: AsyncFunc = async function (this: Context) {
  this.timeout(30000);
  await createTestDatabase();
};

const afterAll: AsyncFunc = async function (this: Context) {
  this.timeout(30000);
  await deleteTestDatabase();
};

const beforeEach: AsyncFunc = async function () {
  await seed();
};

export const mochaHooks: RootHookObject = {
  beforeAll,
  afterAll,
  beforeEach,
};
