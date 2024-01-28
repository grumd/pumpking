import { calculateResultsPp } from './resultsPp';
import { gradeSortValue, isValidGrade } from 'constants/grades';
import { db } from 'db';
import createDebug from 'debug';
import { sql } from 'kysely';
import _ from 'lodash/fp';
import { refreshPlayerTotalExp } from 'services/players/playerExp';
import { getSinglePlayerTotalPp, updatePpHistoryIfNeeded } from 'services/players/playersPp';
import { error } from 'utils';
import { getResultExp } from 'utils/profile/exp';

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
      'chart_instance',
    ])
    .where('id', '=', resultId)
    .executeTakeFirst();

  if (!result) {
    throw error(404, `Result not found: id ${resultId}`);
  }

  const chartInstance = await db
    .selectFrom('chart_instances')
    .select(['chart_instances.label', 'chart_instances.level'])
    .where('id', '=', result.chart_instance)
    .executeTakeFirst();

  if (!chartInstance) {
    throw error(404, `Shared chart not found: id ${result.chart_instance}`);
  }

  const playerId = result.player_id;
  if (!playerId) {
    throw error(500, `Result ${resultId} has no player id`);
  }

  let sharedChartIsChanged = false;

  const sharedChartId = result.shared_chart;

  await db.transaction().execute(async (trx) => {
    let { score_phoenix } = result;
    const { perfects, greats, goods, bads, misses, max_combo, rank_mode } = result;
    const { level, label } = chartInstance;

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
      const scorePhoenix = Math.floor(
        (995000 * (perfects + 0.6 * greats + 0.2 * goods + 0.1 * bads) + 5000 * max_combo) /
          (perfects + greats + goods + bads + misses)
      );

      debug(`Updating score phoenix of result ${resultId} to ${scorePhoenix}`);

      await trx
        .updateTable('results')
        .set({ score_phoenix: scorePhoenix })
        .where('id', '=', resultId)
        .executeTakeFirst();
      score_phoenix = scorePhoenix;
    }

    // Calculate EXP
    if (score_phoenix != null && level != null) {
      const exp = getResultExp({ score: score_phoenix }, { level, label });
      await trx.updateTable('results').set({ exp }).where('id', '=', resultId).executeTakeFirst();
      await refreshPlayerTotalExp(playerId, trx);
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

    const firstTopScore = await trx
      .selectFrom('results')
      .select(['id', 'score_phoenix'])
      .where('player_id', '=', playerId)
      .where('shared_chart', '=', sharedChartId)
      .orderBy('score_phoenix', 'desc')
      .orderBy('added', 'asc')
      .limit(1)
      .executeTakeFirst();

    if (firstTopScore && firstTopScore.id === resultId) {
      // This score is the new best score
      sharedChartIsChanged = true;

      const resultsPp = await calculateResultsPp({ sharedChartId, resultId, trx });
      const pp = resultsPp.get(resultId);

      if (pp) {
        await trx.updateTable('results').set({ pp }).where('id', '=', resultId).executeTakeFirst();
        const totalPp = await getSinglePlayerTotalPp(playerId, trx);
        await trx
          .updateTable('players')
          .set({ pp: totalPp })
          .where('id', '=', playerId)
          .executeTakeFirst();

        await updatePpHistoryIfNeeded(trx);
      }
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
