const debug = require('debug')('backend-ts:test:results');

import _ from 'lodash/fp';
import { assert } from 'chai';
import { knex } from 'db';

import { req } from 'test/helpers';
import { getResultDefaults } from 'test/seeds/initialSeed';

import { Result } from 'models/Result';
import { ResultHighestScoreNoRank } from 'models/ResultHighestScoreNoRank';
import { ResultBestGrade } from 'models/ResultBestGrade';
import { Player } from 'models/Player';
import { SharedChart } from 'models/SharedChart';
import { ChartInstance } from 'models/ChartInstance';

import { mix } from 'constants/currentMix';
import { Grade } from 'constants/grades';

const getLastResultId = () => {
  return knex.query(Result).selectRaw('id', Number, 'LAST_INSERT_ID()').getFirst();
};

const addNewResult = async ({ player_id = 3, score = 1200000, ...rest }: Partial<Result> = {}) => {
  const newResult = {
    ...getResultDefaults({ playerId: player_id, score }),
    ...rest,
  };
  await knex.query(Result).insertItem(newResult);
  const { id } = await getLastResultId();
  await req()
    .post('/results/result-added-effect/' + id)
    .expect(200);
  return {
    id,
    playerId: player_id,
    sharedChartId: newResult.shared_chart_id,
  };
};

describe('RESULTS', () => {
  it('adds a new best score', async () => {
    const { id, playerId, sharedChartId } = await addNewResult();

    // Checking if new result has pp
    const updatedResult = await knex.query(Result).select('id', 'pp').where('id', id).getFirst();
    debug('New result pp', updatedResult.pp);
    assert.isNumber(updatedResult.pp, 'new added result has pp');

    // Checking if new best score is the new result
    const bestScoreResult = await knex
      .query(ResultHighestScoreNoRank)
      .select('result_id')
      .where('player_id', playerId)
      .where('shared_chart_id', sharedChartId)
      .getFirst();
    assert.equal(bestScoreResult.result_id, id, 'new best score is the new result');
    // Checking if new best grade is the new result
    const bestGradeResult = await knex
      .query(ResultBestGrade)
      .select('result_id')
      .where('player_id', playerId)
      .where('shared_chart_id', sharedChartId)
      .getFirst();
    assert.equal(bestGradeResult.result_id, id, 'new best grade is the new result');
  });

  it('recalculates player total pp when adding new best score', async () => {
    const playerId = 3;
    const { pp: totalPpStart } = await knex.query(Player).where('id', playerId).getSingle();
    debug('Start pp', totalPpStart);
    const { pp: resultPpStart } = await knex
      .query(Result)
      .where('player_id', playerId)
      .orderBy('pp', 'desc')
      .getFirst();
    debug('Best result pp', resultPpStart);

    assert.equal(
      resultPpStart,
      totalPpStart,
      'player pp is equal to their best result pp (before new score)'
    );

    await addNewResult({ player_id: playerId });

    const { pp: totalPpEnd } = await knex.query(Player).where('id', playerId).getSingle();
    debug('New pp', totalPpEnd);
    const { pp: resultPpEnd } = await knex
      .query(Result)
      .where('player_id', playerId)
      .orderBy('pp', 'desc')
      .getFirst();
    debug('New best result pp', resultPpEnd);

    assert.equal(
      resultPpEnd,
      totalPpEnd,
      'player pp is equal to their best result pp (after new score)'
    );

    assert.isAbove(totalPpEnd, totalPpStart, 'total player pp should be more than before');
  });

  it(`when player sets a new score that's not a new top score, their pp changes, but other players stays the same`, async () => {
    const playerId = 3;
    const allPlayersPrev = await knex.query(Player).getMany();

    debug(
      'Total player pps:',
      allPlayersPrev.map((pl) => pl.pp)
    );

    // Slightly better result but not better than top score
    await addNewResult({
      player_id: playerId,
      grade: Grade.S,
      score: 750000,
      greats: 5,
      goods: 0,
    });

    const allPlayers = await knex.query(Player).getMany();

    debug(
      'Total player pps (new):',
      allPlayers.map((pl) => pl.pp)
    );

    allPlayers.forEach((player) => {
      const prevPlayer = allPlayersPrev.find((pl) => pl.id === player.id);
      if (player.id === playerId) {
        assert.isAbove(
          player.pp,
          prevPlayer?.pp || 0,
          'current player total pp is more than before'
        );
      } else {
        assert.equal(
          prevPlayer?.pp,
          player.pp,
          'other player pp is equal to their previous total pp'
        );
      }
    });
  });

  it('player total pp follows formula with 3 results from different charts', async () => {
    const playerId = 1;
    const { pp: totalPpStart } = await knex.query(Player).where('id', playerId).getSingle();
    debug('Start pp', totalPpStart);

    const sharedCharts: Partial<SharedChart>[] = [
      { id: 2, track_id: 1, index_in_track: 2 },
      { id: 3, track_id: 1, index_in_track: 3 },
    ];
    const chartInstances: Partial<ChartInstance>[] = [
      { id: 2, track_id: 1, shared_chart_id: 2, mix, label: 'S21', level: 21 },
      { id: 3, track_id: 1, shared_chart_id: 3, mix, label: 'S22', level: 22 },
    ];
    const newResults: Partial<Result>[] = [
      { ...getResultDefaults({ playerId }), shared_chart_id: 2, chart_instance_id: 2 },
      { ...getResultDefaults({ playerId }), shared_chart_id: 3, chart_instance_id: 3 },
    ];

    await knex.query(SharedChart).insertItems(sharedCharts);
    await knex.query(ChartInstance).insertItems(chartInstances);
    await knex.query(Result).insertItems(newResults);
    await req().post('/results/result-added-effect/4').expect(200);
    await req().post('/results/result-added-effect/5').expect(200);

    const { pp: totalPpEnd } = await knex.query(Player).where('id', playerId).getSingle();
    debug('End pp', totalPpEnd);

    assert.isAbove(totalPpEnd, totalPpStart, 'player pp should be higher');

    const results = await knex
      .query(ResultHighestScoreNoRank)
      .innerJoinColumn('result')
      .select('result.pp')
      .where('player_id', playerId)
      .getMany();

    const totalPp = _.flow<[typeof results], typeof results, number>(
      _.orderBy((res: typeof results[number]) => res.result.pp, 'desc'),
      (arr) => arr.reduce((acc, res, index) => acc + 0.95 ** index * res.result.pp, 0)
    )(results);

    debug('Calculated expected total pp:', totalPp);

    // Difference between calculated and database PP should not be too big
    assert.isBelow(
      Math.abs(totalPp - totalPpEnd),
      0.01,
      'player total pp should follow the formula'
    );
  });
});
