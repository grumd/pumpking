import { getTotalPp, roundPp, utcDay } from './totalPp';
import { db, type Transaction } from '@pumpking/database/db';

// The player's results that have pp, for getTotalPp
export const getPlayerPpResults = async (playerId: number, transaction?: Transaction) => {
  const results = await (transaction ?? db)
    .selectFrom('results')
    .select(['id', 'shared_chart as sharedChartId', 'pp', 'gained'])
    .where('player_id', '=', playerId)
    .where('pp', 'is not', null)
    .$narrowType<{ pp: number }>()
    .execute();
  return results;
};

export const getSinglePlayerTotalPp = async (playerId: number, transaction?: Transaction) => {
  const results = await getPlayerPpResults(playerId, transaction);
  return roundPp(getTotalPp(results, utcDay(new Date())));
};

export const getPlayerPpHistory = async (playerId: number) => {
  const history = await db
    .selectFrom('player_pp_history')
    .select(['recorded_at as date', 'pp'])
    .where('player_id', '=', playerId)
    .orderBy('id', 'asc')
    .execute();

  const rankHistory = await db
    .selectFrom('player_rank_history')
    .select(['recorded_at as date', 'rank'])
    .where('player_id', '=', playerId)
    .orderBy('id', 'asc')
    .execute();

  // Both lines go on to now: the total can be up to 1pp off its last row, and the last
  // place is the current one while the player is in the ranking
  const player = await db
    .selectFrom('players')
    .select(['pp', 'hidden'])
    .where('id', '=', playerId)
    .executeTakeFirst();
  const lastRank = rankHistory.at(-1);
  if (player?.pp && !player.hidden && lastRank) {
    const now = new Date();
    history.push({ date: now, pp: player.pp });
    rankHistory.push({ date: now, rank: lastRank.rank });
  }

  return {
    history,
    rankHistory,
  };
};

// Ranking places of the visible players with pp, by players.pp
const getCurrentStandings = async (trx: Transaction | typeof db) => {
  const players = await trx
    .selectFrom('players')
    .select(['id', 'pp'])
    .where('hidden', '=', 0)
    .where('pp', '>', 0)
    .orderBy('pp', 'desc')
    .orderBy('id', 'asc')
    .$narrowType<{ pp: number }>()
    .execute();
  return players.map((player, index) => ({ ...player, rank: index + 1 }));
};

/**
 * Appends to the history what changed since its last rows: every player whose place in
 * the ranking changed, and every total that moved by 1pp or more. Past rows are never
 * changed. Safe to repeat. Called by the effects consumer only, so the calls never overlap
 */
export const recordStandings = async (trx?: Transaction) => {
  const conn = trx ?? db;
  const standings = await getCurrentStandings(conn);

  const lastRanks = await conn
    .selectFrom('player_rank_history as h')
    .innerJoin(
      (eb) =>
        eb
          .selectFrom('player_rank_history')
          .select((eb) => eb.fn.max('id').as('id'))
          .groupBy('player_id')
          .as('last'),
      (join) => join.onRef('last.id', '=', 'h.id')
    )
    .select(['h.player_id', 'h.rank'])
    .execute();
  const lastPps = await conn
    .selectFrom('player_pp_history as h')
    .innerJoin(
      (eb) =>
        eb
          .selectFrom('player_pp_history')
          .select((eb) => eb.fn.max('id').as('id'))
          .groupBy('player_id')
          .as('last'),
      (join) => join.onRef('last.id', '=', 'h.id')
    )
    .select(['h.player_id', 'h.pp'])
    .execute();
  const lastRankById = new Map(lastRanks.map((row) => [row.player_id, row.rank]));
  const lastPpById = new Map(lastPps.map((row) => [row.player_id, row.pp]));

  const recordedAt = new Date();
  const rankRows = standings
    .filter((player) => lastRankById.get(player.id) !== player.rank)
    .map((player) => ({ player_id: player.id, recorded_at: recordedAt, rank: player.rank }));
  const ppRows = standings
    .filter((player) => {
      const lastPp = lastPpById.get(player.id);
      return lastPp === undefined || Math.abs(player.pp - lastPp) >= 1;
    })
    .map((player) => ({ player_id: player.id, recorded_at: recordedAt, pp: player.pp }));

  if (rankRows.length) {
    await conn.insertInto('player_rank_history').values(rankRows).execute();
  }
  if (ppRows.length) {
    await conn.insertInto('player_pp_history').values(ppRows).execute();
  }
};
