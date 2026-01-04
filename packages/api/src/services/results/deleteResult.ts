import { calculateResultsPp } from './resultsPp';
import { db } from 'db';
import createDebug from 'debug';
import { sql } from 'kysely';
import { refreshPlayerTotalExp } from 'services/players/playerExp';
import { getSinglePlayerTotalPp, updatePpHistoryIfNeeded } from 'services/players/playersPp';
import { error } from 'utils';

const debug = createDebug('backend-ts:service:delete-result');

export const deleteResult = async (resultId: number) => {
  const result = await db
    .selectFrom('results')
    .select(['id', 'shared_chart', 'player_id', 'grade', 'pp', 'exp', 'score_phoenix'])
    .where('id', '=', resultId)
    .executeTakeFirst();

  if (!result) {
    throw error(404, `Result not found: id ${resultId}`);
  }

  const playerId = result.player_id;
  if (!playerId) {
    throw error(500, `Result ${resultId} has no player id`);
  }

  const sharedChartId = result.shared_chart;

  await db.transaction().execute(async (trx) => {
    // 1. Handle results_best_grade if this result was the best grade
    const bestGradeRecord = await trx
      .selectFrom('results_best_grade')
      .select(['result_id', 'player_id', 'shared_chart_id'])
      .where('player_id', '=', playerId)
      .where('shared_chart_id', '=', sharedChartId)
      .where('result_id', '=', resultId)
      .executeTakeFirst();

    if (bestGradeRecord) {
      // This result was the best grade, delete the record first
      await trx
        .deleteFrom('results_best_grade')
        .where('player_id', '=', playerId)
        .where('shared_chart_id', '=', sharedChartId)
        .executeTakeFirst();
      debug(`Deleted best grade record for player ${playerId} chart ${sharedChartId}`);

      // Find the new best grade result
      const newBestGradeResult = await trx
        .selectFrom('results')
        .select(['id', 'grade'])
        .where('player_id', '=', playerId)
        .where('shared_chart', '=', sharedChartId)
        .where('id', '!=', resultId)
        .where('grade', 'is not', null)
        .orderBy(sql`FIELD(grade, 'sss', 'ss', 's', 'a', 'b', 'c', 'd', 'f')`)
        .limit(1)
        .executeTakeFirst();

      if (newBestGradeResult) {
        await trx
          .insertInto('results_best_grade')
          .values({
            player_id: playerId,
            shared_chart_id: sharedChartId,
            result_id: newBestGradeResult.id,
          })
          .executeTakeFirst();
        debug(`Inserted new best grade result ${newBestGradeResult.id}`);
      }
    }

    // 2. Check if this was the top score for PP calculation
    const wasTopScore = result.pp != null;

    // 3. Delete the result
    await trx.deleteFrom('results').where('id', '=', resultId).executeTakeFirst();
    debug(`Deleted result ${resultId}`);

    // 4. If this had PP, recalculate PP for the next best result on this chart
    if (wasTopScore) {
      // Find the new top score for this player-chart
      const newTopScore = await trx
        .selectFrom('results')
        .select(['id', 'score_phoenix'])
        .where('player_id', '=', playerId)
        .where('shared_chart', '=', sharedChartId)
        .orderBy('score_phoenix', 'desc')
        .limit(1)
        .executeTakeFirst();

      if (newTopScore) {
        // Recalculate PP for the new top score
        const resultsPp = await calculateResultsPp({
          sharedChartId,
          resultId: newTopScore.id,
          trx,
        });
        const newPp = resultsPp.get(newTopScore.id);

        if (newPp) {
          await trx
            .updateTable('results')
            .set({ pp: newPp })
            .where('id', '=', newTopScore.id)
            .executeTakeFirst();
          debug(`Updated PP for new top result ${newTopScore.id} to ${newPp}`);
        }
      }

      // 5. Recalculate player total PP
      const totalPp = await getSinglePlayerTotalPp(playerId, trx);
      await trx
        .updateTable('players')
        .set({ pp: totalPp })
        .where('id', '=', playerId)
        .executeTakeFirst();
      debug(`Updated player ${playerId} total PP to ${totalPp}`);

      // Update PP history if needed
      await updatePpHistoryIfNeeded(trx);
    }

    // 6. Recalculate player total EXP
    if (result.exp != null) {
      await refreshPlayerTotalExp(playerId, trx);
      debug(`Refreshed player ${playerId} total EXP`);
    }

    // 7. Update shared_charts timestamp
    await trx
      .updateTable('shared_charts')
      .set({
        last_updated_at: sql`UTC_TIMESTAMP(3)`,
      })
      .where('id', '=', sharedChartId)
      .executeTakeFirst();
    debug(`Updated shared chart ${sharedChartId} timestamps`);
  });

  debug(`Successfully deleted result ${resultId} with all cascading changes`);
};
