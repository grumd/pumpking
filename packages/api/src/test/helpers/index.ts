import request, { SuperTest, Test } from 'supertest';
import { app } from 'app';

export const req = (): SuperTest<Test> => {
  return request(app);
};
