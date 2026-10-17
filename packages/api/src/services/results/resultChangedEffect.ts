import { calculateResultsPp } from './resultsPp';
import { db } from '@pumpking/database/db';
import createDebug from 'debug';
import { sql } from 'kysely';
import { refreshPlayerTotalExp } from 'services/players/playerExp';
import { getSinglePlayerTotalPp, recordStandings } from 'services/players/playersPp';
import { getResultExp } from 'services/results/exp';

const debug = createDebug('backend-ts:processor:on-result-changed');

const PASS_GRADES = ['SSS', 'SS', 'S', 'A+', 'B+', 'C+', 'D+', 'F+'];

/**
 * Recomputes what depends on a player's results on one chart, after an admin edited or
 * deleted one of them: each result's exp (and pass status up to XX, where it follows
 * from the grade) and pp, then the player's totals. Safe to replay: everything is
 * recomputed
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

    const resultsPp = await calculateResultsPp({ sharedChartId, trx });

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
        .set({ exp, is_pass: isPass, pp: resultsPp.get(result.id) ?? null })
        .where('id', '=', result.id)
        .execute();
    }

    const totalPp = await getSinglePlayerTotalPp(playerId, trx);
    await trx.updateTable('players').set({ pp: totalPp }).where('id', '=', playerId).execute();
    await refreshPlayerTotalExp(playerId, trx);
    await recordStandings(trx);

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
