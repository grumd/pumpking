import { createTestDatabase, deleteTestDatabase } from '@pumpking/core/test/testDatabase';
import type { AsyncFunc, Context, RootHookObject } from 'mocha';

const beforeAll: AsyncFunc = async function (this: Context) {
  this.timeout(30000);
  await createTestDatabase();
};

const afterAll: AsyncFunc = async function (this: Context) {
  this.timeout(30000);
  await deleteTestDatabase();
};

export const mochaHooks: RootHookObject = {
  beforeAll,
  afterAll,
};
