import { assert } from 'chai';
import { req } from 'test/helpers';

describe('Health check', () => {
  it('reports ok when the database is reachable', async () => {
    const res = await req().get('/healthz').expect(200);

    assert.deepEqual(res.body, { status: 'ok' });
  });
});
