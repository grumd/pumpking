import { getVisiblePlayers, type BotPlayer } from '../../platform/players';
import { MIXES } from '@pumpking/core/constants/mixes';
import { db } from '@pumpking/core/db';
import { sql } from 'kysely';

// The data of the rivals notifications: each player's best result on a chart, as the
// legacy best-results feed (C2) computed it. Scores are phoenix scores; rank mode results
// compete only with rank mode results

export interface ChartInfo {
  // The shared chart
  id: number;
  trackName: string;
  // The label and level on the latest mix
  chartLabel: string;
  level: number | null;
}

export interface BestResult {
  id: number;
  player: BotPlayer;
  rankMode: number;
  score: number;
  scoreIncrease: number | null;
  exactGainDate: boolean;
  addedMinsAgo: number;
  addedSecondsAgo: number;
}

/** The chart as shown on its latest mix; charts that aren't on it are left out */
export const getChartInfo = async (sharedChartId: number): Promise<ChartInfo | undefined> => {
  const chart = await db
    .selectFrom('shared_charts')
    .innerJoin('tracks', 'tracks.id', 'shared_charts.track')
    .innerJoin('chart_instances', (join) =>
      join
        .onRef('chart_instances.shared_chart', '=', 'shared_charts.id')
        .on('chart_instances.mix', '=', MIXES.Phoenix2)
    )
    .select([
      'shared_charts.id',
      'tracks.full_name',
      'chart_instances.label',
      'chart_instances.level',
    ])
    .where('shared_charts.id', '=', sharedChartId)
    .executeTakeFirst();
  return (
    chart && {
      id: chart.id,
      trackName: chart.full_name,
      chartLabel: chart.label,
      level: chart.level,
    }
  );
};

/**
 * Every visible player's best result on a chart in one rank mode: the highest score, the
 * earliest one of equal scores
 */
export const getBestResults = async (
  sharedChartId: number,
  rankMode: number
): Promise<BestResult[]> => {
  const rows = await db
    .selectFrom('results')
    .select([
      'id',
      'player_id',
      'score_phoenix',
      'score_increase',
      'exact_gain_date',
      sql<number>`TIMESTAMPDIFF(SECOND, added, UTC_TIMESTAMP())`.as('addedSecondsAgo'),
    ])
    .where('shared_chart', '=', sharedChartId)
    .where(sql`COALESCE(rank_mode, 0)`, '=', rankMode)
    .where('score_phoenix', '>', 0)
    .where('is_hidden', '=', 0)
    .orderBy('player_id')
    .orderBy('score_phoenix', 'desc')
    .orderBy('gained')
    .orderBy('id')
    .execute();

  const bestRows = rows.filter(
    (row, index) => index === 0 || rows[index - 1].player_id !== row.player_id
  );
  const players = new Map(
    (await getVisiblePlayers(bestRows.map((row) => row.player_id!))).map((p) => [p.id, p])
  );

  return bestRows.flatMap((row) => {
    const player = players.get(row.player_id!);
    if (!player) {
      return [];
    }
    const addedSecondsAgo = Number(row.addedSecondsAgo);
    return [
      {
        id: row.id,
        player,
        rankMode,
        score: row.score_phoenix!,
        scoreIncrease: row.score_increase,
        exactGainDate: row.exact_gain_date === 1,
        addedMinsAgo: Math.floor(addedSecondsAgo / 60),
        addedSecondsAgo,
      },
    ];
  });
};

/** The result's rank mode and chart, if it's one the notifications can be about */
export const getResultForNotifications = async (resultId: number) => {
  return db
    .selectFrom('results')
    .select(['id', 'shared_chart', sql<number>`COALESCE(rank_mode, 0)`.as('rankMode')])
    .where('id', '=', resultId)
    .executeTakeFirst();
};

/** The charts with results added in the last `minutes` */
export const getRecentlyUpdatedCharts = async (minutes: number) => {
  const rows = await db
    .selectFrom('results')
    .select('shared_chart')
    .distinct()
    .where('added', '>=', sql<Date>`UTC_TIMESTAMP() - INTERVAL ${minutes} MINUTE`)
    .execute();
  return rows.map((row) => row.shared_chart);
};
