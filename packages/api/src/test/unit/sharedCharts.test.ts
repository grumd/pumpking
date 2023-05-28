const debug = require('debug')('backend-ts:test:shared-charts');

import _ from 'lodash/fp';
import { assert } from 'chai';
import { knex } from 'db';

import { req } from 'test/helpers';
import { getResultDefaults } from 'test/seeds/initialSeed';

import { Result } from 'models/Result';
import { ResultHighestScoreNoRank } from 'models/ResultHighestScoreNoRank';
import { ResultBestGrade } from 'models/ResultBestGrade';
import { SharedChart } from 'models/SharedChart';
import { ChartInstance } from 'models/ChartInstance';
import { Player } from 'models/Player';

import { mix } from 'constants/currentMix';

const getLastResultId = () => {
  return knex.query(Result).selectRaw('id', Number, 'LAST_INSERT_ID()').getFirst();
};

describe('SHARED CHARTS', () => {
  it('refreshes chart when result is added without effect', async () => {
    const playerId = 3;
    const newResult = getResultDefaults({ playerId, score: 1200000 });
    const sharedChartId = newResult.shared_chart_id;

    await knex.query(Result).insertItem(newResult);
    const { id } = await getLastResultId();
    await req().post(`/shared-charts/${sharedChartId}/refresh`).expect(200);

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

  it('player total pp follows formula with 3 results from different charts (but with shared chart refresh)', async () => {
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

    await req().post(`/shared-charts/2/refresh`).expect(200);
    await req().post(`/shared-charts/3/refresh`).expect(200);

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
