import { db, type Transaction } from 'db';
import { sql } from 'kysely';
import _ from 'lodash/fp';

type ScoreRecord = {
  id: number;
  song: string | null;
  label: string;
  diff: number | null;
  pp: number;
};

const getPlayerResults = async ({
  playerId,
  transaction,
}: {
  playerId: number;
  transaction?: Transaction;
}) => {
  const results = await (transaction ?? db)
    .with('ranked_results', (_db) => {
      return _db
        .selectFrom('results as r')
        .innerJoin('chart_instances', 'chart_instances.id', 'r.chart_instance')
        .innerJoin('players', 'players.id', 'r.player_id')
        .innerJoin('tracks', 'tracks.id', 'chart_instances.track')
        .select([
          'r.id as result_id',
          'r.score_xx',
          'r.grade',
          'r.perfects',
          'r.greats',
          'r.goods',
          'r.bads',
          'r.misses',
          'r.pp',
          'r.player_name',
          'r.shared_chart as shared_chart_id',
          'r.player_id',
          'chart_instances.level',
          'chart_instances.label',
          'chart_instances.interpolated_difficulty',
          'tracks.short_name',
          'players.nickname',
          sql<number>`row_number() over (partition by r.shared_chart, r.player_id order by ${sql.ref(
            'pp'
          )} desc)`.as('pp_rank'),
        ])
        .where('r.player_id', '=', playerId)
        .where('r.pp', 'is not', null);
    })
    .selectFrom('ranked_results')
    .selectAll()
    .where('ranked_results.pp_rank', '=', 1)
    .orderBy('ranked_results.pp', 'desc')
    .limit(200)
    .execute();

  // Assert that PP is not null because we had a "where" clause
  return results as ((typeof results)[number] & { pp: number })[];
};

const getPlayerPpFromResults = (
  bestResults: {
    result_id: number;
    shared_chart_id: number;
    label: string;
    interpolated_difficulty: number | null;
    pp: number;
    player_name: string;
    short_name: string | null;
    nickname: string;
  }[]
) => {
  if (!bestResults || !bestResults.length) {
    return { nickname: '', pp: 0, bestScores: [] };
  }

  const player = {
    nickname: bestResults[0].nickname,
    pp: 0,
    bestScores: [] as ScoreRecord[],
  };

  bestResults.forEach((res, index) => {
    player.pp += 0.95 ** index * res.pp;
    if (index < 20) {
      player.bestScores.push({
        id: res.result_id,
        song: res.short_name,
        label: res.label,
        diff: res.interpolated_difficulty,
        pp: res.pp,
      });
    }
  });

  return player;
};

export const getSinglePlayerPpData = async (playerId: number, transaction?: Transaction) => {
  const results = await getPlayerResults({ playerId, transaction });
  const playerData = getPlayerPpFromResults(results);
  return playerData;
};

export const getSinglePlayerTotalPp = async (playerId: number, transaction?: Transaction) => {
  return (await getSinglePlayerPpData(playerId, transaction))?.pp;
};

export const getPlayersTotalPp = async () => {
  const playerIds = await db.selectFrom('players').select('id').where('hidden', '=', 0).execute();
  const players = await Promise.all(playerIds.map(({ id }) => getSinglePlayerPpData(id)));
  return players;
};

export const getPlayerPpHistory = async (playerId: number) => {
  const history = await db
    .selectFrom('pp_history')
    .select(['date', 'pp'])
    .where('player_id', '=', playerId)
    .orderBy('date', 'asc')
    .execute();

  const rankHistory = await db
    .selectFrom('pp_rank_history')
    .select(['date', 'rank'])
    .where('player_id', '=', playerId)
    .orderBy('date', 'asc')
    .execute();

  return {
    history,
    rankHistory,
  };
};

export const updatePpHistoryIfNeeded = async (trx?: Transaction) => {
  // TODO: as an optimization we can avoid recalculating pp for all players because usually only one player has new results

  const playerIds = await (trx ?? db)
    .selectFrom('players')
    .select('id')
    .where('id', '>', 1)
    .execute();

  const latestStats = await (trx ?? db)
    .selectFrom('pp_history as ph1')
    .select(['ph1.pp', 'ph1.player_id', 'ph1.date'])
    .innerJoin(
      (eb) =>
        eb
          .selectFrom('pp_history')
          .select([(eb) => eb.fn.max('date').as('max_date'), 'player_id'])
          .groupBy('player_id')
          .as('ph2'),
      (join) =>
        join.onRef('ph2.max_date', '=', 'ph1.date').onRef('ph2.player_id', '=', 'ph1.player_id')
    )
    .orderBy('pp', 'desc')
    .execute();

  const latestStatsById: Record<number, { pp: string; place: number; date: Date }> = {};

  for (let i = 0; i < latestStats.length; i++) {
    const player = latestStats[i];
    latestStatsById[player.player_id] = { pp: player.pp, place: i + 1, date: player.date };
  }

  const newStatsById: Record<number, { pp: string; place?: number }> = {};

  for (const { id: playerId } of playerIds) {
    const results = await (trx ?? db)
      .with('ranked_results', (_db) => {
        return _db
          .selectFrom('results')
          .select([
            'player_id',
            'track_name',
            'chart_label',
            'pp',
            sql<number>`row_number() over (partition by results.shared_chart order by pp desc)`.as(
              'pp_rank'
            ),
          ])
          .where('player_id', '=', playerId)
          .where('pp', 'is not', null)
          .$narrowType<{ pp: number }>()
          .orderBy('pp', 'desc');
      })
      .selectFrom('ranked_results')
      .selectAll()
      .where('pp_rank', '=', 1)
      .orderBy('pp', 'desc')
      .limit(200)
      .execute();

    const totalPp = results
      .reduce((sum, item, index) => {
        return sum + 0.95 ** index * item.pp;
      }, 0)
      .toFixed(2);

    if (!newStatsById[playerId]) newStatsById[playerId] = { pp: totalPp };
    newStatsById[playerId].pp = totalPp;
  }

  const playerIdsSorted = Object.keys(newStatsById)
    .map((key) => Number(key))
    .sort((a, b) => {
      return Number(newStatsById[b].pp) - Number(newStatsById[a].pp);
    });

  for (let i = 0; i < playerIdsSorted.length; i++) {
    const id = playerIdsSorted[i];

    if (latestStatsById[id]?.place !== i + 1) {
      await (trx ?? db)
        .insertInto('pp_rank_history')
        .values({
          date: new Date(),
          player_id: id,
          rank: i + 1,
        })
        .onDuplicateKeyUpdate({
          rank: i + 1,
        })
        .execute();
    }

    if (latestStatsById[id]?.pp !== newStatsById[id].pp) {
      await (trx ?? db)
        .insertInto('pp_history')
        .values({
          date: new Date(),
          player_id: id,
          pp: newStatsById[id].pp,
        })
        .onDuplicateKeyUpdate({
          pp: newStatsById[id].pp,
        })
        .execute();
    }
  }
};
