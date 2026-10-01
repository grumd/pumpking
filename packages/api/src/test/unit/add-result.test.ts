import { db } from '@pumpking/database/db';
import { getPhoenixScore } from '@pumpking/utils/phoenixScore';
import { assert } from 'chai';
import fs from 'fs';
import path from 'path';
import { applyEffects, req } from 'test/helpers';
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
    await applyEffects();

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
    await applyEffects();

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
    await applyEffects();

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
    await applyEffects();

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
    await applyEffects();

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
    await applyEffects();
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
    await applyEffects();

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
    await applyEffects();

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
    await applyEffects();

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

    await db
      .insertInto('shared_charts')
      .values({ id: 2, track: 1, index_in_track: 2, type: 'S' })
      .execute();
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
    await applyEffects();

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
    await applyEffects();
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
    await applyEffects();

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
    await applyEffects();

    const results = await db.selectFrom('results').selectAll().where('player_id', '=', 7).execute();

    assert.strictEqual(results[0].is_pass, 1, `Score is a pass`);
    assert.strictEqual(results[0].grade, 'A+', `Grade is A+`);
  });
});

describe('Add a new Phoenix 2 result (mix 28) via tRPC', () => {
  // The mix 28 instance of the second seeded chart
  const sharedChartId = 3;
  const screenshotDataUrl =
    'data:image/jpeg;base64,' +
    fs.readFileSync(path.join(__dirname, '../files/test.jpg')).toString('base64');
  const stats = { perfect: 90, great: 5, good: 3, bad: 1, miss: 1, combo: 95 };
  const score = getPhoenixScore(stats);

  const postPhoenix2Result = (overrides: Record<string, unknown> = {}) =>
    req()
      .post('/trpc/results.addResultMutation')
      .set('session', addResultsSession)
      .send({
        json: {
          screenshot: screenshotDataUrl,
          fileName: 'test.jpg',
          playerId: 7,
          grade: 'S+',
          mix: 'Phoenix2',
          mod: '',
          score,
          ...stats,
          date: '2020-01-01',
          isExactDate: true,
          sharedChartId,
          pass: true,
          ...overrides,
        },
      });

  const getLatestResult = () =>
    db
      .selectFrom('results')
      .selectAll()
      .where('shared_chart', '=', sharedChartId)
      .orderBy('id', 'desc')
      .executeTakeFirst();

  // tRPC responses are superjson-encoded, the error message lives in `error.json`
  const getErrorMessage = (res: { body: { error: { json: { message: string } } } }) =>
    res.body.error.json.message;

  it('rejects an unknown mix', async () => {
    const res = await postPhoenix2Result({ mix: 'NotAMix' }).expect(400);
    assert.match(getErrorMessage(res), /Invalid enum value/);
  });

  it('rejects a score that does not match the phoenix formula', async () => {
    const res = await postPhoenix2Result({ score: score + 100 }).expect(400);
    assert.match(
      getErrorMessage(res),
      new RegExp(`Score ${score + 100} doesn't match expected score ${score}`)
    );
  });

  it('adds the result with mix 28 and the given grade', async () => {
    await postPhoenix2Result().expect(200);

    const result = (await getLatestResult())!;
    assert.strictEqual(result.mix, 28, 'result mix is 28');
    assert.strictEqual(result.mix_name, 'Phoenix2', 'result mix name is Phoenix2');
    assert.strictEqual(result.score, score, 'score matches the phoenix formula');
    assert.strictEqual(result.score_phoenix, score, 'phoenix score is stored');
    assert.strictEqual(result.grade, 'S+', 'grade is stored as given');
    assert.strictEqual(result.is_pass, 1, 'result is marked as pass');
    assert.strictEqual(result.chart_label, 'S20', 'chart label is taken from the mix 28 instance');
    assert.strictEqual(result.chart_instance, 3, 'chart instance is the mix 28 one');
  });

  it('does not append + to the grade (unlike XX and earlier)', async () => {
    await postPhoenix2Result({ grade: 'A' }).expect(200);

    const result = (await getLatestResult())!;
    assert.strictEqual(result.grade, 'A', 'grade stays A, no + is appended');
    assert.strictEqual(result.is_pass, 1, 'result is marked as pass');
  });

  it('adds a result on an HD (half-double) chart', async () => {
    await postPhoenix2Result({ sharedChartId: 4 }).expect(200);

    const result = (await db
      .selectFrom('results')
      .selectAll()
      .where('shared_chart', '=', 4)
      .orderBy('id', 'desc')
      .executeTakeFirst())!;
    assert.strictEqual(result.mix, 28, 'result mix is 28');
    assert.strictEqual(result.chart_label, 'HD18', 'chart label is the HD one');
    assert.strictEqual(result.chart_instance, 4, 'chart instance is the HD one');
    assert.strictEqual(result.grade, 'S+', 'grade is stored as given');
  });
});
