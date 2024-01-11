// import createDebug from 'debug';
// const debug = createDebug('backend-ts:test:players');
import { assert } from 'chai';
import { req } from 'test/helpers';

describe('Players', () => {
  it('has players', async () => {
    const res = await req().get('/players/all').expect(200);

    assert.isNotEmpty(res.body, 'has some players in the list');
    Object.keys(res.body).forEach((key) => {
      assert.typeOf(res.body[key].nickname, 'string', 'nicknames should be strings');
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

  it('players have grade data', async () => {
    const res = await req().get('/players/1/grades').expect(200);

    assert.isNotEmpty(res.body.totalCounts, 'has counts for charts');
    assert.isNotEmpty(res.body.gradeCounts, 'has counts for player');
    assert.isNumber(res.body.totalCounts[0].level, 'level is a number');
    assert.isNumber(res.body.gradeCounts[0].level, 'level is a number');
    assert.isString(res.body.totalCounts[0].type, 'type is string');
    assert.isString(res.body.gradeCounts[0].type, 'type is string');
    assert.isNumber(res.body.totalCounts[0].level, 'count is a number');
    assert.isNumber(res.body.gradeCounts[0].level, 'count is a number');
    assert.isString(res.body.gradeCounts[0].grade, 'grade is a string');
  });
});
