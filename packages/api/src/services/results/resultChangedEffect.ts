import { calculateResultsPp } from './resultsPp';
import { db } from '@pumpking/core/db';
import { getResultExp } from '@pumpking/core/profile/exp';
import createDebug from 'debug';
import { sql } from 'kysely';
import { refreshPlayerTotalExp } from 'services/players/playerExp';
import { getSinglePlayerTotalPp, updatePpHistoryIfNeeded } from 'services/players/playersPp';

const debug = createDebug('backend-ts:processor:on-result-changed');

const PASS_GRADES = ['SSS', 'SS', 'S', 'A+', 'B+', 'C+', 'D+', 'F+'];

/**
 * Recomputes what depends on a player's results on one chart, after an admin edited or
 * deleted one of them: each result's exp (and pass status up to XX, where it follows
 * from the grade), pp on the player's best result only, then the player's totals.
 * Unlike resultAddedEffect, the edited result may have stopped being the best one, so
 * pp is cleared on all of them first. Safe to replay: everything is recomputed
 */
export const recalculatePlayerChart = async (playerId: number, sharedChartId: number) => {
  await db.transaction().execute(async (trx) => {
    const results = await trx
      .selectFrom('results')
      .innerJoin('chart_instances', 'chart_instances.id', 'results.chart_instance')
      .select([
        'results.id',
        'results.mix',
        'results.grade',
        'results.is_pass',
        'results.score_phoenix',
        'chart_instances.level',
        'chart_instances.label',
      ])
      .where('results.player_id', '=', playerId)
      .where('results.shared_chart', '=', sharedChartId)
      .execute();

    for (const result of results) {
      const exp =
        result.score_phoenix != null && result.level != null
          ? getResultExp(
              { score: result.score_phoenix },
              { level: result.level, label: result.label }
            )
          : null;
      const isPass =
        result.mix <= 26 && result.grade
          ? Number(PASS_GRADES.includes(result.grade))
          : result.is_pass;
      await trx
        .updateTable('results')
        .set({ exp, is_pass: isPass })
        .where('id', '=', result.id)
        .execute();
    }

    await trx
      .updateTable('results')
      .set({ pp: null })
      .where('player_id', '=', playerId)
      .where('shared_chart', '=', sharedChartId)
      .execute();

    // The best result of every player on the chart; the player's own is among them
    const bestResultsPp = await calculateResultsPp({ sharedChartId, trx });
    const best = results.find((result) => bestResultsPp.has(result.id));
    const pp = best && bestResultsPp.get(best.id);
    if (best && pp) {
      await trx.updateTable('results').set({ pp }).where('id', '=', best.id).execute();
    }

    const totalPp = await getSinglePlayerTotalPp(playerId, trx);
    await trx.updateTable('players').set({ pp: totalPp }).where('id', '=', playerId).execute();
    await refreshPlayerTotalExp(playerId, trx);
    await updatePpHistoryIfNeeded(trx);

    await trx
      .updateTable('shared_charts')
      .set({ last_updated_at: sql`UTC_TIMESTAMP(3)` })
      .where('id', '=', sharedChartId)
      .execute();
  });

  debug(`Recalculated player ${playerId} on shared chart ${sharedChartId}`);
};

export const resultChangedEffect = async ({
  sharedChartId,
  playerIds,
}: {
  sharedChartId: number;
  playerIds: number[];
}) => {
  for (const playerId of playerIds) {
    await recalculatePlayerChart(playerId, sharedChartId);
  }
};
