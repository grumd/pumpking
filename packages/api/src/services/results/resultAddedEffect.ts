import { calculateResultsPp } from './resultsPp';
import { db } from '@pumpking/database/db';
import { getPhoenixScore } from '@pumpking/utils/phoenixScore';
import createDebug from 'debug';
import { sql } from 'kysely';
import _ from 'lodash/fp';
import { refreshPlayerTotalExp } from 'services/players/playerExp';
import { getSinglePlayerTotalPp, updatePpHistoryIfNeeded } from 'services/players/playersPp';
import { getResultExp } from 'services/results/exp';
import { error } from 'utils';

const debug = createDebug('backend-ts:processor:on-result-added');

export const resultAddedEffect = async (resultId: number) => {
  const result = await db
    .selectFrom('results')
    .select([
      'id',
      'shared_chart',
      'grade',
      'score_phoenix',
      'player_id',
      'is_hidden',
      'perfects',
      'greats',
      'goods',
      'bads',
      'misses',
      'max_combo',
      'chart_instance',
      'mix',
    ])
    .where('id', '=', resultId)
    .executeTakeFirst();

  if (!result) {
    // Deleted before the effects job got to it
    debug(`Result ${resultId} not found, skipping`);
    return;
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
    const { perfects, greats, goods, bads, misses, max_combo, mix, grade } = result;
    const { level, label } = chartInstance;

    // Calculate score_phoenix if needed
    if (
      score_phoenix == null &&
      perfects != null &&
      greats != null &&
      goods != null &&
      bads != null &&
      misses != null &&
      max_combo != null
    ) {
      const scorePhoenix = getPhoenixScore({
        perfect: perfects,
        great: greats,
        good: goods,
        bad: bads,
        miss: misses,
        combo: max_combo,
      });

      debug(`Updating score phoenix of result ${resultId} to ${scorePhoenix}`);

      await trx
        .updateTable('results')
        .set({ score_phoenix: scorePhoenix })
        .where('id', '=', resultId)
        .executeTakeFirst();
      score_phoenix = scorePhoenix;
    }

    if (mix <= 26 && grade) {
      const isPass = ['SSS', 'SS', 'S', 'A+', 'B+', 'C+', 'D+', 'F+'].includes(grade);
      await trx
        .updateTable('results')
        .set({ is_pass: isPass ? 1 : 0 })
        .where('id', '=', resultId)
        .executeTakeFirst();
    }

    // Calculate EXP
    if (score_phoenix != null && level != null) {
      const exp = getResultExp({ score: score_phoenix }, { level, label });
      await trx.updateTable('results').set({ exp }).where('id', '=', resultId).executeTakeFirst();
      await refreshPlayerTotalExp(playerId, trx);
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
