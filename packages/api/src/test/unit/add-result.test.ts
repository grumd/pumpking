import path from 'path';
import { assert } from 'chai';

import { req } from 'test/helpers';
import { addResultsSession } from 'test/helpers/sessions';

import { db } from 'db';

describe('Add new result manually', () => {
  it('error 401 when user is not authorized', async () => {
    await req().post('/results/add-result').expect(401);
  });

  it('error 400 when data is not added', async () => {
    await req().post('/results/add-result').set('session', addResultsSession).expect(400);
  });

  it('error 400 when file is not added', async () => {
    await req()
      .post('/results/add-result')
      .set('session', addResultsSession)
      .field('playerId', 7)
      .field('grade', 'SSS')
      .field('mix', 'XX')
      .field('mod', '')
      .field('score', 1000000)
      .field('perfect', 100)
      .field('great', 0)
      .field('good', 0)
      .field('bad', 0)
      .field('miss', 0)
      .field('combo', 100)
      .field('date', '2020-01-01')
      .field('isExactDate', true)
      .field('sharedChartId', 1)
      .expect(400);
  });

  it('error 400 when number of steps is wrong', async () => {
    const res = await req()
      .post('/results/add-result')
      .set('session', addResultsSession)
      .field('playerId', 7)
      .field('grade', 'SSS')
      .field('mix', 'XX')
      .field('mod', '')
      .field('score', 1000000)
      .field('perfect', 120)
      .field('great', 0)
      .field('good', 0)
      .field('bad', 0)
      .field('miss', 0)
      .field('combo', 120)
      .field('date', '2020-01-01')
      .field('isExactDate', true)
      .field('sharedChartId', 1)
      .attach('screenshot', path.join(__dirname, '../files/test.jpg'))
      .expect(400);

    assert.equal(res.body.message, 'Bad Request: Total steps is higher than maximum possible');
  });

  it('error 400 when score is wrong', async () => {
    const res = await req()
      .post('/results/add-result')
      .set('session', addResultsSession)
      .field('playerId', 7)
      .field('grade', 'SSS')
      .field('mix', 'XX')
      .field('mod', '')
      .field('score', 3000000)
      .field('perfect', 100)
      .field('great', 0)
      .field('good', 0)
      .field('bad', 0)
      .field('miss', 0)
      .field('combo', 100)
      .field('date', '2020-01-01')
      .field('isExactDate', true)
      .field('sharedChartId', 1)
      .attach('screenshot', path.join(__dirname, '../files/test.jpg'))
      .expect(400);

    assert.equal(res.body.message, 'Bad Request: Score is higher than maximum possible');
  });

  it('error 403 when player id doesnt match', async () => {
    const res = await req()
      .post('/results/add-result')
      .set('session', addResultsSession)
      .field('playerId', 1)
      .field('grade', 'SSS')
      .field('mix', 'XX')
      .field('mod', '')
      .field('score', 1000000)
      .field('perfect', 100)
      .field('great', 0)
      .field('good', 0)
      .field('bad', 0)
      .field('miss', 0)
      .field('combo', 100)
      .field('date', '2020-01-01')
      .field('isExactDate', true)
      .field('sharedChartId', 1)
      .attach('screenshot', path.join(__dirname, '../files/test.jpg'))
      .expect(403);

    assert.equal(res.body.message, 'Forbidden: You can only add results for yourself');
  });

  it('result added when all data is correct', async () => {
    const res = await req()
      .post('/results/add-result')
      .set('session', addResultsSession)
      .field('playerId', 7)
      .field('grade', 'SSS')
      .field('mix', 'XX')
      .field('mod', '')
      .field('score', 1000000)
      .field('perfect', 100)
      .field('great', 0)
      .field('good', 0)
      .field('bad', 0)
      .field('miss', 0)
      .field('combo', 100)
      .field('date', '2020-01-01')
      .field('isExactDate', true)
      .field('sharedChartId', 1)
      .attach('screenshot', path.join(__dirname, '../files/test.jpg'))
      .expect(200);

    assert.isNotEmpty(res.body, 'has a response');
  });

  it('all effects are applied correctly', async () => {
    let player = await db.selectFrom('players').selectAll().where('id', '=', 7).executeTakeFirst();
    assert.isNull(player?.pp, `player's pp is null by default`);

    // add first result for this user
    await req()
      .post('/results/add-result')
      .set('session', addResultsSession)
      .field('playerId', 7)
      .field('grade', 'A+')
      .field('mix', 'XX')
      .field('mod', '')
      .field('score', 800000)
      .field('perfect', 90)
      .field('great', 5)
      .field('good', 0)
      .field('bad', 0)
      .field('miss', 5)
      .field('combo', 50)
      .field('date', '2020-01-01')
      .field('isExactDate', true)
      .field('sharedChartId', 1)
      .attach('screenshot', path.join(__dirname, '../files/test.jpg'))
      .expect(200);

    assert.equal(
      (
        await db
          .selectFrom('results_best_grade as rbg')
          .leftJoin('results', 'results.id', 'rbg.result_id')
          .selectAll()
          .where('rbg.player_id', '=', 7)
          .where('rbg.shared_chart_id', '=', 1)
          .executeTakeFirst()
      )?.grade,
      'A+',
      'best grade is A+'
    );

    const firstResult = await db
      .selectFrom('results')
      .selectAll()
      .where('player_id', '=', 7)
      .executeTakeFirst();
    player = await db.selectFrom('players').selectAll().where('id', '=', 7).executeTakeFirst();

    const firstPp = player?.pp;

    assert.isAbove(firstResult?.pp as number, 0, `results's pp is above 0`);
    assert.isAbove(firstPp as number, 0, `player's pp is above 0`);
    assert.equal(firstResult?.pp, firstPp, 'player pp and result pp are equal');

    // add second result for this user
    await req()
      .post('/results/add-result')
      .set('session', addResultsSession)
      .field('playerId', 7)
      .field('grade', 'SSS')
      .field('mix', 'XX')
      .field('mod', '')
      .field('score', 1000000)
      .field('perfect', 100)
      .field('great', 0)
      .field('good', 0)
      .field('bad', 0)
      .field('miss', 0)
      .field('combo', 100)
      .field('date', '2020-01-01')
      .field('isExactDate', true)
      .field('sharedChartId', 1)
      .attach('screenshot', path.join(__dirname, '../files/test.jpg'))
      .expect(200);

    const secondResult = await db
      .selectFrom('results')
      .selectAll()
      .where('player_id', '=', 7)
      .orderBy('id', 'desc')
      .executeTakeFirst();
    player = await db.selectFrom('players').selectAll().where('id', '=', 7).executeTakeFirst();

    const secondPp = player?.pp;

    assert.isAbove(
      secondResult?.pp as number,
      firstResult?.pp as number,
      `new results's pp should be better than first result's`
    );
    assert.isAbove(
      secondPp as number,
      firstPp as number,
      `player's pp should be higher after a better result`
    );
    assert.equal(secondResult?.pp, secondPp, 'player pp and result pp are equal');

    await db.insertInto('shared_charts').values({ id: 2, track: 1, index_in_track: 2 }).execute();
    await db
      .insertInto('chart_instances')
      .values({
        id: 2,
        track: 1,
        shared_chart: 2,
        mix: 26,
        label: 'S16',
        level: 16,
        max_possible_score_norank: 500000,
        max_total_steps: 50,
        min_total_steps: 50,
      })
      .execute();

    // add third result for this user, different chart
    await req()
      .post('/results/add-result')
      .set('session', addResultsSession)
      .field('playerId', 7)
      .field('grade', 'SSS')
      .field('mix', 'XX')
      .field('mod', '')
      .field('score', 500000)
      .field('perfect', 50)
      .field('great', 0)
      .field('good', 0)
      .field('bad', 0)
      .field('miss', 0)
      .field('combo', 50)
      .field('date', '2020-01-01')
      .field('isExactDate', true)
      .field('sharedChartId', 2)
      .attach('screenshot', path.join(__dirname, '../files/test.jpg'))
      .expect(200);

    const thirdResult = await db
      .selectFrom('results')
      .selectAll()
      .where('player_id', '=', 7)
      .orderBy('id', 'desc')
      .executeTakeFirst();
    player = await db.selectFrom('players').selectAll().where('id', '=', 7).executeTakeFirst();

    const thirdPp = player?.pp;

    assert.isAbove(
      thirdPp as number,
      secondPp as number,
      `player's pp should be higher than before after 3rd result`
    );
    assert.isBelow(
      thirdResult?.pp as number,
      secondResult?.pp as number,
      `3rd result pp is lower than 2nd result because of lower chart level`
    );
    assert.isAbove(
      thirdPp as number,
      thirdResult?.pp as number,
      `total player pp is bigger than one result's pp`
    );
    assert.isAbove(
      thirdPp as number,
      secondResult?.pp as number,
      `total player pp is bigger than one result's pp`
    );
    assert.isBelow(
      thirdPp as number,
      (thirdResult?.pp ?? 0) + (secondResult?.pp ?? 0),
      'total player pp is smaller than sum of all result pps'
    );

    assert.equal(
      (
        await db
          .selectFrom('results_best_grade as rbg')
          .leftJoin('results', 'results.id', 'rbg.result_id')
          .selectAll()
          .where('rbg.player_id', '=', 7)
          .where('rbg.shared_chart_id', '=', 1)
          .executeTakeFirst()
      )?.grade,
      'SSS',
      'best grade is SSS'
    );
  });
});
