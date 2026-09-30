import { app } from '../app';
import { assert } from 'chai';
import request from 'supertest';

describe('Health check', () => {
  it('reports ok when the database is reachable', async () => {
    const res = await request(app).get('/healthz').expect(200);

    assert.deepEqual(res.body, { status: 'ok' });
  });
});
