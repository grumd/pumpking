import { assert } from 'chai';
import { db } from 'db';
import path from 'path';
import { req } from 'test/helpers';
import { addResultsSession } from 'test/helpers/sessions';

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
      .field('pass', true)
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
      .field('pass', true)
      .attach('screenshot', path.join(__dirname, '../files/test.jpg'))
      .expect(400);

    assert.strictEqual(
      res.body.message,
      'Bad Request: Total steps is higher than maximum possible'
    );
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
      .field('pass', true)
      .attach('screenshot', path.join(__dirname, '../files/test.jpg'))
      .expect(400);

    assert.strictEqual(res.body.message, 'Bad Request: Score is higher than maximum possible');
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
      .field('pass', true)
      .attach('screenshot', path.join(__dirname, '../files/test.jpg'))
      .expect(403);

    assert.strictEqual(res.body.message, 'Forbidden: You can only add results for yourself');
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
      .field('pass', true)
      .attach('screenshot', path.join(__dirname, '../files/test.jpg'))
      .expect(200);

    assert.isNotEmpty(res.body, 'has a response');
  });

  it('pp is not calculated if its not a new top score', async () => {
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
      .field('pass', true)
      .attach('screenshot', path.join(__dirname, '../files/test.jpg'))
      .expect(200);

    const getLatestResult = async () =>
      await db
        .selectFrom('results')
        .selectAll()
        .where('player_id', '=', 7)
        .orderBy('id', 'desc')
        .executeTakeFirst();

    assert.isAbove((await getLatestResult())?.pp ?? -1, 0, `results's pp is above 0`);

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
      .field('date', '2020-01-02')
      .field('isExactDate', true)
      .field('sharedChartId', 1)
      .field('pass', true)
      .attach('screenshot', path.join(__dirname, '../files/test.jpg'))
      .expect(200);

    assert.isNull((await getLatestResult())?.pp, `new results's pp is null`);

    await req()
      .post('/results/add-result')
      .set('session', addResultsSession)
      .field('playerId', 7)
      .field('grade', 'SS')
      .field('mix', 'XX')
      .field('mod', '')
      .field('score', 990000)
      .field('perfect', 95)
      .field('great', 5)
      .field('good', 0)
      .field('bad', 0)
      .field('miss', 0)
      .field('combo', 100)
      .field('date', '2020-01-03')
      .field('isExactDate', true)
      .field('sharedChartId', 1)
      .field('pass', true)
      .attach('screenshot', path.join(__dirname, '../files/test.jpg'))
      .expect(200);

    assert.isNull((await getLatestResult())?.pp, `new results's pp is null`);
  });

  it('exp is calculated', async () => {
    let player = await db.selectFrom('players').selectAll().where('id', '=', 7).executeTakeFirst();
    assert.isNull(player?.exp, `player's exp is null by default`);

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
      .field('pass', true)
      .attach('screenshot', path.join(__dirname, '../files/test.jpg'))
      .expect(200);

    const result = await db
      .selectFrom('results')
      .selectAll()
      .where('player_id', '=', 7)
      .executeTakeFirst();
    assert.isNotNaN(parseFloat(result?.exp ?? ''), `results's exp is a number`);

    player = await db.selectFrom('players').selectAll().where('id', '=', 7).executeTakeFirst();
    assert.isNotNaN(parseFloat(player?.exp ?? ''), `player's exp is a number`);
  });

  it('exp total is calculated correctly', async () => {
    let player = await db.selectFrom('players').selectAll().where('id', '=', 7).executeTakeFirst();
    assert.isNull(player?.exp, `player's exp is null by default`);

    // add two results for this user
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
      .field('pass', true)
      .attach('screenshot', path.join(__dirname, '../files/test.jpg'))
      .expect(200);
    await req()
      .post('/results/add-result')
      .set('session', addResultsSession)
      .field('playerId', 7)
      .field('grade', 'S')
      .field('mix', 'XX')
      .field('mod', '')
      .field('score', 900000)
      .field('perfect', 90)
      .field('great', 5)
      .field('good', 5)
      .field('bad', 0)
      .field('miss', 0)
      .field('combo', 95)
      .field('date', '2020-01-01')
      .field('isExactDate', true)
      .field('sharedChartId', 1)
      .field('pass', true)
      .attach('screenshot', path.join(__dirname, '../files/test.jpg'))
      .expect(200);

    const results = await db.selectFrom('results').selectAll().where('player_id', '=', 7).execute();
    player = await db.selectFrom('players').selectAll().where('id', '=', 7).executeTakeFirst();

    assert.isNotNaN(parseFloat(player?.exp ?? ''), `player's exp is a number`);
    assert.strictEqual(
      parseFloat(player?.exp ?? ''),
      Math.max(parseFloat(results[0]?.exp ?? ''), parseFloat(results[1]?.exp ?? '')),
      `player's exp is equal to the highest result's exp`
    );
  });

  it('all effects are applied correctly', async () => {
    let player = await db.selectFrom('players').selectAll().where('id', '=', 7).executeTakeFirst();
    assert.isNull(player?.pp, `player's pp is null by default`);

    const initHistory = (await req().get('/players/7/pp-history').expect(200)).body;
    assert.strictEqual(initHistory.history.length, 0, `player's pp history is empty by default`);
    assert.strictEqual(
      initHistory.rankHistory.length,
      0,
      `player's pp history is empty by default`
    );

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
      .field('pass', true)
      .attach('screenshot', path.join(__dirname, '../files/test.jpg'))
      .expect(200);

    assert.strictEqual(
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

    assert.isAbove(firstResult?.pp ?? -1, 0, `results's pp is above 0`);
    assert.isAbove(firstPp ?? -1, 0, `player's pp is above 0`);
    assert.strictEqual(firstResult?.pp, firstPp, 'player pp and result pp are equal');

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
      .field('pass', true)
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
    assert.strictEqual(secondResult?.pp, secondPp, 'player pp and result pp are equal');

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
        max_total_steps: 64,
        min_total_steps: 64,
      })
      .execute();

    // add third result for this user, different chart
    await req()
      .post('/results/add-result')
      .set('session', addResultsSession)
      .field('playerId', 7)
      .field('grade', 'S')
      .field('mix', 'XX')
      .field('mod', '')
      .field('score', 400000)
      .field('perfect', 50)
      .field('great', 8)
      .field('good', 5)
      .field('bad', 1)
      .field('miss', 0)
      .field('combo', 50)
      .field('date', '2020-01-01')
      .field('isExactDate', true)
      .field('sharedChartId', 2)
      .field('pass', true)
      .attach('screenshot', path.join(__dirname, '../files/test.jpg'))
      .expect(200);

    const thirdResult = await db
      .selectFrom('results')
      .selectAll()
      .where('player_id', '=', 7)
      .orderBy('id', 'desc')
      .executeTakeFirst();
    player = await db.selectFrom('players').selectAll().where('id', '=', 7).executeTakeFirst();

    // Actual score is calculated as 872976.52 - should be rounded down
    assert.strictEqual(thirdResult?.score_phoenix, 872976, 'Phoenix score is calculated correctly');

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

    assert.strictEqual(
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

    const history = (await req().get('/players/7/pp-history').expect(200)).body;

    assert.isAbove(history.history.length, 0, `player's pp history is not empty`);
    assert.isAbove(history.rankHistory.length, 0, `player's pp history is not empty`);
    assert.strictEqual(history.rankHistory[0].rank, 1, 'player is #1 in rank history');
    assert.isNotNaN(parseFloat(history.history[0].pp ?? ''), `history pp is a number`);
  });

  it('for XX results is_pass is set correctly', async () => {
    // add two results, A- and S
    await req()
      .post('/results/add-result')
      .set('session', addResultsSession)
      .field('playerId', 7)
      .field('grade', 'A')
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
      .field('pass', false)
      .attach('screenshot', path.join(__dirname, '../files/test.jpg'))
      .expect(200);
    await req()
      .post('/results/add-result')
      .set('session', addResultsSession)
      .field('playerId', 7)
      .field('grade', 'S')
      .field('mix', 'XX')
      .field('mod', '')
      .field('score', 900000)
      .field('perfect', 90)
      .field('great', 5)
      .field('good', 5)
      .field('bad', 0)
      .field('miss', 0)
      .field('combo', 95)
      .field('date', '2020-01-01')
      .field('isExactDate', true)
      .field('sharedChartId', 1)
      .field('pass', true)
      .attach('screenshot', path.join(__dirname, '../files/test.jpg'))
      .expect(200);

    const results = await db.selectFrom('results').selectAll().where('player_id', '=', 7).execute();

    assert.strictEqual(results[0].is_pass, 0, `First score (A) is not a pass`);
    assert.strictEqual(results[1].is_pass, 1, `Second score (S) is a pass`);
  });

  it('for XX results + is added to grades', async () => {
    await req()
      .post('/results/add-result')
      .set('session', addResultsSession)
      .field('playerId', 7)
      .field('grade', 'A')
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
      .field('pass', true)
      .attach('screenshot', path.join(__dirname, '../files/test.jpg'))
      .expect(200);

    const results = await db.selectFrom('results').selectAll().where('player_id', '=', 7).execute();

    assert.strictEqual(results[0].is_pass, 1, `Score is a pass`);
    assert.strictEqual(results[0].grade, 'A+', `Grade is A+`);
  });
});
