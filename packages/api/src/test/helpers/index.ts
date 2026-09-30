import { app } from 'app';
import { effectsConsumer } from 'services/effects/effectsConsumer';
import request, { SuperTest, Test } from 'supertest';

export const req = (): SuperTest<Test> => {
  return request(app);
};

// Adding a result only queues its effects: this applies them, as the effects job would
export const applyEffects = () => effectsConsumer.processBatch();
