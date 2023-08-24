import { sql } from 'kysely';
import _ from 'lodash/fp';

import { db } from 'db';

import { gradeSortValue, isValidGrade } from 'constants/grades';
import { error } from 'utils';

import { getSinglePlayerTotalPp } from 'services/players/playersPp';
import { calculateResultsPp } from './resultsPp';

import createDebug from 'debug';
const debug = createDebug('backend-ts:processor:on-result-added');

export const resultAddedEffect = async (resultId: number) => {
  const result = await db
    .selectFrom('results')
    .select([
      'id',
      'shared_chart',
      'grade',
      'score_xx',
      'score_phoenix',
      'rank_mode',
      'player_id',
      'is_hidden',
      'perfects',
      'greats',
      'goods',
      'bads',
      'misses',
      'max_combo',
      'rank_mode',
    ])
    .where('id', '=', resultId)
    .executeTakeFirst();

  if (!result) {
    throw error(404, `Result not found: id ${resultId}`);
  }

  const playerId = result.player_id;
  if (!playerId) {
    throw error(500, `Result ${resultId} has no player id`);
  }

  let sharedChartIsChanged = false;

  const sharedChartId = result.shared_chart;

  await db.transaction().execute(async (trx) => {
    const { perfects, greats, goods, bads, misses, max_combo, rank_mode, score_phoenix } = result;

    // Calculate score_phoenix if needed
    if (
      score_phoenix == null &&
      !rank_mode &&
      perfects != null &&
      greats != null &&
      goods != null &&
      bads != null &&
      misses != null &&
      max_combo != null
    ) {
      const scorePhoenix =
        (995000 * (perfects + 0.6 * greats + 0.2 * goods + 0.1 * bads) + 5000 * max_combo) /
        (perfects + greats + goods + bads + misses);

      debug(`Updating score phoenix of result ${resultId} to ${scorePhoenix}`);

      await trx
        .updateTable('results')
        .set({ score_phoenix: scorePhoenix })
        .where('id', '=', resultId)
        .executeTakeFirst();
    }

    // Updating best grade result if needed
    const bestGradeResult = await trx
      .selectFrom('results_best_grade as rbg')
      .innerJoin('results', 'result_id', 'results.id')
      .select(['grade', 'rbg.shared_chart_id', 'rbg.player_id'])
      .where('rbg.player_id', '=', playerId)
      .where('rbg.shared_chart_id', '=', sharedChartId)
      .executeTakeFirst();

    // if new grade is better than last best grade
    if (
      isValidGrade(result.grade) &&
      (!bestGradeResult ||
        !isValidGrade(bestGradeResult.grade) ||
        gradeSortValue[bestGradeResult.grade] < gradeSortValue[result.grade])
    ) {
      if (bestGradeResult) {
        await trx
          .updateTable('results_best_grade')
          .set({ result_id: result.id })
          .where('player_id', '=', playerId)
          .where('shared_chart_id', '=', sharedChartId)
          .executeTakeFirst();
      } else {
        await trx
          .insertInto('results_best_grade')
          .values({
            player_id: playerId,
            shared_chart_id: sharedChartId,
            result_id: result.id,
          })
          .executeTakeFirst();
      }
      sharedChartIsChanged = true;
    } else {
      debug('Not a new best grade result');
    }

    // Updating highest score result if needed
    const isRank = result.rank_mode === 1;
    const tableName = isRank ? 'results_highest_score_rank' : 'results_highest_score_no_rank';

    const highestScoreResult = await trx
      .selectFrom(`${tableName} as best`)
      .innerJoin('results', `result_id`, 'results.id')
      .select(['score_xx', 'best.shared_chart_id', 'best.player_id'])
      .where('best.player_id', '=', playerId)
      .where('best.shared_chart_id', '=', sharedChartId)
      .executeTakeFirst();

    // If new score is better than previous highest score
    if (
      result.score_xx &&
      (!highestScoreResult ||
        !highestScoreResult.score_xx ||
        highestScoreResult.score_xx < result.score_xx)
    ) {
      if (highestScoreResult) {
        await trx
          .updateTable(tableName)
          .set({ result_id: result.id })
          .where('player_id', '=', playerId)
          .where('shared_chart_id', '=', sharedChartId)
          .executeTakeFirst();
      } else {
        await trx
          .insertInto(tableName)
          .values({
            player_id: playerId,
            shared_chart_id: sharedChartId,
            result_id: result.id,
          })
          .executeTakeFirst();
      }
      sharedChartIsChanged = true;

      // ***
      // Because this result was a new high score:
      // Calculating new PP values for this chart
      const resultsPpMap = await calculateResultsPp(sharedChartId, trx);
      const entries = Array.from(resultsPpMap.entries());
      const resultIds = entries.filter(([, pp]) => pp).map(([resultId]) => resultId);

      const previousResultsPp = await trx
        .selectFrom('results')
        .select(['id', 'pp'])
        .where('id', 'in', resultIds)
        .execute();

      const resultsThatChanged = entries.filter(([resultId, pp]) => {
        if (!pp) {
          return false;
        }
        const oldResultPp = _.find({ id: resultId }, previousResultsPp)?.pp;
        // Only update results and totals if pp of user's result changed
        return !oldResultPp || Math.abs(oldResultPp - pp) > 0.01;
      });

      const playerIds = await trx
        .selectFrom('results')
        .select('player_id')
        .distinct()
        .where(
          'id',
          'in',
          resultsThatChanged.map(([id]) => id)
        )
        .execute();

      debug(`Calculated pp for results in sharedChart ${sharedChartId}`);

      // Updating pp values for all results in this shared chart
      await Promise.all(
        resultsThatChanged.map(([resultId, pp]) => {
          debug(`Updating result ${resultId} with pp ${pp}`);

          return trx
            .updateTable('results')
            .set({ pp })
            .where('id', '=', resultId)
            .executeTakeFirst();
        })
      );

      // Updating pp values for all players whose results were updated
      await Promise.all(
        playerIds.map(async (value) => {
          const playerId = value.player_id;
          if (playerId) {
            const totalPp = await getSinglePlayerTotalPp(playerId, trx);
            debug(`Updating player ${playerId} with total pp ${totalPp}`);

            await trx
              .updateTable('players')
              .set({ pp: totalPp })
              .where('id', '=', playerId)
              .executeTakeFirst();
          }
        })
      );
    } else {
      debug('Not a new highest score result');
    }

    if (sharedChartIsChanged) {
      await trx
        .updateTable('shared_charts')
        .set({
          last_updated_at: sql`UTC_TIMESTAMP(3)`,
          top_results_added_at: sql`UTC_TIMESTAMP(3)`,
        })
        .where('id', '=', sharedChartId)
        .executeTakeFirst();

      debug(`Updated shared chart ${sharedChartId} last change date`);
    }
  });
};
