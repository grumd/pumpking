import _ from 'lodash/fp';
import type { Response, Request, NextFunction } from 'express';

import { knex, knexEx } from 'db';

import { error } from 'utils';
import { getChartBestGrades, getChartBestResults } from 'utils/results';

import { Result } from 'models/Result';
import { ResultHighestScoreNoRank } from 'models/ResultHighestScoreNoRank';
import { ResultHighestScoreRank } from 'models/ResultHighestScoreRank';
import { ResultBestGrade } from 'models/ResultBestGrade';
import { Player } from 'models/Player';
import { ChartInstance } from 'models/ChartInstance';

import { mix } from 'constants/currentMix';

import { calculateResultsPp } from 'processors/resultsPp';
import { getSinglePlayerTotalPp } from 'processors/playersPp';

const debug = require('debug')('backend-ts:controller:sharedCharts');

export const getSharedChartsInfo = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const getQuery = () =>
      knex
        .query(ChartInstance)
        .select('interpolated_difficulty', 'label', 'level')
        .selectRaw('shared_chart_id', Number, 'shared_chart.id')
        .selectRaw('max_pp', Number, 'shared_chart.max_pp')
        .selectRaw('short_name', String, 'track.short_name')
        .selectRaw('duration', String, 'track.duration')
        .selectRaw('full_name', String, 'track.full_name')
        .innerJoinColumn('shared_chart')
        .innerJoinColumn('track')
        .where('mix', '=', mix);
    const charts = await getQuery().getMany();
    response.json(charts);
  } catch (e: any) {
    debug('ERROR:', e.message);
    next(error(500, 'Database Error: ' + e.message));
  }
};

export const refreshSharedChartResults = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  const sharedChartId = _.toNumber(request.params.sharedChartId);

  try {
    const noRankResults = await knex
      .query(Result)
      .select('id', 'shared_chart_id', 'player_id')
      .where('rank_mode', 0)
      .andWhere('shared_chart_id', sharedChartId)
      .andWhere('is_hidden', 0)
      .orderBy('score_xx', 'desc')
      .getMany();
    const noRankBestResults = getChartBestResults(noRankResults);

    const rankResults = await knex
      .query(Result)
      .select('id', 'shared_chart_id', 'player_id')
      .where('rank_mode', 1)
      .andWhere('shared_chart_id', sharedChartId)
      .andWhere('is_hidden', 0)
      .orderBy('score_xx', 'desc')
      .getMany();
    const rankBestResults = getChartBestResults(rankResults);

    debug('Fetched all best results from table "results"');

    const bestResultsNoRank = _.sortBy('id', _.flatten(_.values(noRankBestResults)));
    const bestResultsRank = _.sortBy('id', _.flatten(_.values(rankBestResults)));
    debug('Sorted by id');

    const gradeResults = await knex
      .query(Result)
      .select('id', 'shared_chart_id', 'player_id', 'grade')
      .whereNotNull('grade')
      .where('shared_chart_id', sharedChartId)
      .andWhere('is_hidden', 0)
      .getMany();
    debug('Fetched all grade results from table "results"');
    const bestGradeResultsPerChart = getChartBestGrades(gradeResults);
    debug('Calculated which results have the best grade');
    const flatBestGradeResults = _.sortBy('id', _.flatten(_.values(bestGradeResultsPerChart)));

    let transaction = await knex.beginTransaction();
    try {
      const noRankDeleteQuery = knex
        .query(ResultHighestScoreNoRank)
        .transacting(transaction)
        .where('shared_chart_id', sharedChartId)
        .del();
      const rankDeleteQuery = knex
        .query(ResultHighestScoreRank)
        .transacting(transaction)
        .where('shared_chart_id', sharedChartId)
        .del();
      const gradeDeleteQuery = knex
        .query(ResultBestGrade)
        .transacting(transaction)
        .where('shared_chart_id', sharedChartId)
        .del();

      await Promise.all([noRankDeleteQuery, rankDeleteQuery, gradeDeleteQuery]);

      const noRankQuery = knex
        .query(ResultHighestScoreNoRank)
        .transacting(transaction)
        .insertItems(
          bestResultsNoRank.map((res) => ({
            shared_chart_id: res.shared_chart_id,
            player_id: res.player_id,
            result_id: res.id,
          }))
        );
      const rankQuery = knex
        .query(ResultHighestScoreRank)
        .transacting(transaction)
        .insertItems(
          bestResultsRank.map((res) => ({
            shared_chart_id: res.shared_chart_id,
            player_id: res.player_id,
            result_id: res.id,
          }))
        );
      const gradeQuery = knex
        .query(ResultBestGrade)
        .transacting(transaction)
        .insertItems(
          flatBestGradeResults.map((res) => ({
            shared_chart_id: res.shared_chart_id,
            player_id: res.player_id,
            result_id: res.id,
          }))
        );

      await Promise.all([noRankQuery, rankQuery, gradeQuery]);
      await transaction.commit();
      debug('Finished finding which results are best results');
    } catch (e: any) {
      await transaction.rollback();
      throw e;
    }

    /*****************************
     * Update pp values for this sharedChartId
     *****************************/
    const resultsPpMap = await calculateResultsPp(sharedChartId);
    const entries = Array.from(resultsPpMap.entries());
    const resultIds = entries.map(([resultId]) => resultId);
    const playerIds = await knex
      .query(Result)
      .select('player_id')
      .distinct()
      .whereIn('id', resultIds)
      .getMany();

    debug(`Calculated pp for results in sharedChart ${sharedChartId}`);

    transaction = await knex.beginTransaction();
    try {
      // Updating pp values for all results in this shared chart
      await Promise.all(
        entries.map(([resultId, pp]) => {
          debug(`Updating result ${resultId} with pp ${pp}`);
          return knex
            .query(Result)
            .transacting(transaction)
            .updateItemByPrimaryKey(resultId, { pp });
        })
      );

      // Updating pp values for all players whose results were updated
      await Promise.all(
        playerIds.map(async (value) => {
          const playerId = value.player_id;
          const totalPp = await getSinglePlayerTotalPp(playerId, transaction);
          debug(`Updating player ${playerId} with total pp ${totalPp}`);
          await knex
            .query(Player)
            .transacting(transaction)
            .updateItemByPrimaryKey(playerId, { pp: totalPp });
        })
      );

      await knexEx
        .raw(
          `UPDATE shared_charts SET last_updated_at = UTC_TIMESTAMP(3) WHERE id = ${sharedChartId}`
        )
        .transacting(transaction);
      debug(`Updated shared chart ${sharedChartId} last change date`);

      await transaction.commit();

      response.sendStatus(200);
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  } catch (e: any) {
    debug('ERROR:', e.message);
    next(error(500, 'Database Error: ' + e.message));
  }
};
