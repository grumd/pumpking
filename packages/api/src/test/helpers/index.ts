import { app } from 'app';
import { effectsConsumer } from 'services/effects/effectsConsumer';
import request, { SuperTest, Test } from 'supertest';

export const req = (): SuperTest<Test> => {
  return request(app);
};

export const applyEffects = () => effectsConsumer.processBatch();
