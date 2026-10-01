import { db } from '@pumpking/database/db';
import { addEvent } from '@pumpking/database/events';
import createDebug from 'debug';
import { error } from 'utils';

const debug = createDebug('backend-ts:service:delete-result');

// Deletes a result. Its player's pp / exp on the chart and totals are recalculated by the
// effects job, from the resultChanged event stored with the delete
export const deleteResult = async (resultId: number) => {
  const result = await db
    .selectFrom('results')
    .select(['id', 'shared_chart', 'player_id'])
    .where('id', '=', resultId)
    .executeTakeFirst();

  if (!result) {
    throw error(404, `Result not found: id ${resultId}`);
  }
  const playerId = result.player_id;
  if (!playerId) {
    throw error(500, `Result ${resultId} has no player id`);
  }

  await db.transaction().execute(async (trx) => {
    await trx.deleteFrom('results').where('id', '=', resultId).execute();
    await addEvent(trx, 'resultChanged', {
      resultId,
      sharedChartId: result.shared_chart,
      playerIds: [playerId],
    });
  });

  debug(`Deleted result ${resultId}`);
};
