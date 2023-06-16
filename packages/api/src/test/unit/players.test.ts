// const debug = require('debug')('backend-ts:test:players');

import { req } from 'test/helpers';
import { assert } from 'chai';

describe('Players', () => {
  it('has players', async () => {
    const res = await req().get('/players/all').expect(200);

    assert.isNotEmpty(res.body, 'has some players in the list');
    Object.keys(res.body).forEach((key) => {
      assert.typeOf(res.body[key].nickname, 'string', 'nicknames should be strings');
      assert.typeOf(res.body[key].arcade_name, 'string', 'pp values should be strings');
    });
  });

  // TODO: calculate pp for all results before calling stats
  // mocked data doesn't have pp values
  it.skip('has players with stats', async () => {
    const res = await req().get('/players/stats').expect(200);

    assert.isNotEmpty(res.body, 'has some players in the list');
    Object.keys(res.body).forEach((key) => {
      assert.typeOf(res.body[key].nickname, 'string', 'nicknames should be strings');
      assert.typeOf(res.body[key].pp, 'number', 'pp values should be numbers');
    });
  });
});
