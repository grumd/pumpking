// const debug = require('debug')('backend-ts:test:players');

import { req } from 'test/helpers';
import { assert } from 'chai';

describe('PLAYERS', () => {
  it('has players with pp', async () => {
    const res = await req().get('/players/pp').expect(200);

    assert.isNotEmpty(res.body, 'has some players in the list');
    Object.keys(res.body).forEach((key) => {
      assert.typeOf(res.body[key].nickname, 'string', 'nicknames should be strings');
      assert.typeOf(res.body[key].pp, 'number', 'pp values should be numbers');
    });
  });
});
