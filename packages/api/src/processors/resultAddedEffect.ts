import { gradeSortValue } from 'constants/grades';
import { knex, knexEx } from 'db';
import _ from 'lodash/fp';

import { Player } from 'models/Player';
import { Result } from 'models/Result';
import { ResultBestGrade } from 'models/ResultBestGrade';
import { ResultHighestScoreNoRank } from 'models/ResultHighestScoreNoRank';
import { ResultHighestScoreRank } from 'models/ResultHighestScoreRank';

import { error } from 'utils';

import { getSinglePlayerTotalPp } from './playersPp';
import { calculateResultsPp } from './resultsPp';

const debug = require('debug')('backend-ts:processor:on-result-added');

export const resultAddedEffect = async (resultId: number) => {
  const result = await knex
    .query(Result)
    .select('id', 'shared_chart_id', 'grade', 'score_xx', 'rank_mode', 'player_id', 'is_hidden')
    .where('id', resultId)
    .getSingle();

  if (!result) {
    throw error(404, `Result not found: id ${resultId}`);
  }

  let sharedChartIsChanged = false;

  const sharedChartId = result.shared_chart_id;

  const transaction = await knex.beginTransaction();
  try {
    // Updating best grade result if needed
    const bestGradeResult = await knex
      .query(ResultBestGrade)
      .transacting(transaction)
      .select('result.grade', 'shared_chart_id', 'player_id')
      .where('player_id', result.player_id)
      .andWhere('shared_chart_id', result.shared_chart_id)
      .innerJoinColumn('result')
      .getFirstOrNull();

    // if (bestGradeResult)
    // {
    //   debug(`old grade = ${bestGradeResult.result.grade}, sort value = ${gradeSortValue[bestGradeResult.result.grade]}`)
    //   debug(`new grade = ${result.grade}, sort value = ${gradeSortValue[result.grade]}`)
    // }
    if (
      !bestGradeResult ||
      gradeSortValue[bestGradeResult.result.grade] < gradeSortValue[result.grade]
    ) {
      const bestGradeData = {
        player_id: result.player_id,
        shared_chart_id: result.shared_chart_id,
        result_id: result.id,
      };

      if (bestGradeResult) {
        await knex
          .query(ResultBestGrade)
          .transacting(transaction)
          .where('player_id', bestGradeResult.player_id)
          .andWhere('shared_chart_id', bestGradeResult.shared_chart_id)
          .updateItem(bestGradeData);
        debug('Updated best grade result');
      } else {
        await knex.query(ResultBestGrade).transacting(transaction).insertItem(bestGradeData);
        debug('Added new best grade result');
      }

      sharedChartIsChanged = true;
    } else {
      debug('Not a new best grade result');
    }

    // Updating highest score result if needed
    const isRank = result.rank_mode === 1;
    const HighestScoreTable = isRank ? ResultHighestScoreRank : ResultHighestScoreNoRank;

    const highestScoreResult = await knex
      .query(HighestScoreTable)
      .transacting(transaction)
      .select('result.score_xx', 'shared_chart_id', 'player_id')
      .where('player_id', result.player_id)
      .andWhere('shared_chart_id', result.shared_chart_id)
      .innerJoinColumn('result')
      .getFirstOrNull();

    if (!highestScoreResult || highestScoreResult.result.score_xx < result.score_xx) {
      const highestScoreData = {
        player_id: result.player_id,
        shared_chart_id: result.shared_chart_id,
        result_id: result.id,
      };

      if (highestScoreResult) {
        await knex
          .query(HighestScoreTable)
          .transacting(transaction)
          .where('player_id', highestScoreResult.player_id)
          .andWhere('shared_chart_id', highestScoreResult.shared_chart_id)
          .updateItem(highestScoreData);
        debug('Updated highest score result');
      } else {
        await knex.query(HighestScoreTable).transacting(transaction).insertItem(highestScoreData);
        debug('Added new highest score result');
      }

      sharedChartIsChanged = true;

      // ***
      // Because this result was a new high score:
      // Calculating new PP values for this chart
      const resultsPpMap = await calculateResultsPp(sharedChartId, transaction);
      const entries = Array.from(resultsPpMap.entries());
      const resultIds = entries.map(([resultId]) => resultId);
      const previousResultsPp = await knex
        .query(Result)
        .select('id', 'pp')
        .whereIn('id', resultIds)
        .getMany();

      const resultsThatChanged = entries.filter(([resultId, pp]) => {
        const oldResultPp = _.find({ id: resultId }, previousResultsPp)?.pp;
        // Only update results and totals if pp of user's result changed
        return !oldResultPp || Math.abs(oldResultPp - pp) > 0.01;
      });

      const playerIds = await knex
        .query(Result)
        .select('player_id')
        .distinct()
        .whereIn(
          'id',
          resultsThatChanged.map(([id]) => id)
        )
        .getMany();
      debug(`Calculated pp for results in sharedChart ${sharedChartId}`);

      // Updating pp values for all results in this shared chart
      await Promise.all(
        resultsThatChanged.map(([resultId, pp]) => {
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
    } else {
      debug('Not a new highest score result');
    }

    if (sharedChartIsChanged) {
      //not working due to type checks:
      //await knex
      //  .query(SharedChart)
      //  .transacting(transaction)
      //  .updateItemByPrimaryKey(sharedChartId, {last_updated_at: knexEx.raw<Date>('now(3)')});
      await knexEx
        .raw(
          `UPDATE shared_charts SET last_updated_at = UTC_TIMESTAMP(3), top_results_added_at = UTC_TIMESTAMP(3) WHERE id = ${sharedChartId}`
        )
        .transacting(transaction);
      debug(`Updated shared chart ${sharedChartId} last change date`);
    }

    await transaction.commit();
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
};
