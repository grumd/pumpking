import {
  getChartPp,
  getTotalFromChartPp,
  ppAgeFactor,
  type PpResult,
  roundPp,
  utcDay,
  utcDayStart,
} from './totalPp';
import { db } from '@pumpking/database/db';
import createDebug from 'debug';
import _ from 'lodash/fp';

const debug = createDebug('backend-ts:services:pp-history-rebuild');

type HistoryResult = PpResult & { playerId: number };
type RankRow = { player_id: number; recorded_at: Date; rank: number };
type PpRow = { player_id: number; recorded_at: Date; pp: number };

/**
 * Replays the ranking from the first result to `today`, with the results' current pp.
 * Totals change when a result is gained, and at midnight when results get older. Every
 * change of place is a rank row, at the time it happened. A player's total is a pp row at
 * most once a day, when it moved by 1pp or more since their last pp row.
 * `results` are sorted by `gained`
 */
export const replayPpHistory = (results: HistoryResult[], today: number) => {
  const rankRows: RankRow[] = [];
  const ppRows: PpRow[] = [];

  const resultsByPlayer = new Map<number, PpResult[]>();
  // Each player's pp per chart on the day being replayed
  const chartPpByPlayer = new Map<number, Map<number, number>>();
  const totals = new Map<number, number>();
  const lastRanks = new Map<number, number>();
  const lastPps = new Map<number, number>();
  // When each player's total last changed, the time of their pp row for the day
  const changedAt = new Map<number, Date>();

  const recordRanks = (recordedAt: Date) => {
    const ranked = [...totals.entries()]
      .filter(([, total]) => total > 0)
      .sort(([idA, a], [idB, b]) => b - a || idA - idB);
    ranked.forEach(([playerId], index) => {
      if (lastRanks.get(playerId) !== index + 1) {
        lastRanks.set(playerId, index + 1);
        rankRows.push({ player_id: playerId, recorded_at: recordedAt, rank: index + 1 });
      }
    });
  };

  // Returns whether the total changed
  const updateTotal = (playerId: number, at: Date) => {
    const total = roundPp(getTotalFromChartPp(chartPpByPlayer.get(playerId)!));
    if (total === totals.get(playerId)) {
      return false;
    }
    totals.set(playerId, total);
    changedAt.set(playerId, at);
    return true;
  };

  let next = 0;
  const firstDay = results.length ? utcDay(results[0].gained) : today + 1;
  for (let day = firstDay; day <= today; day++) {
    const dayStart = utcDayStart(day);

    // Results got a day older
    let anyChanged = false;
    for (const [playerId, playerResults] of resultsByPlayer) {
      chartPpByPlayer.set(playerId, getChartPp(playerResults, day));
      anyChanged = updateTotal(playerId, dayStart) || anyChanged;
    }
    if (anyChanged) {
      recordRanks(dayStart);
    }

    for (; next < results.length && utcDay(results[next].gained) <= day; next++) {
      const result = results[next];
      const playerResults = resultsByPlayer.get(result.playerId) ?? [];
      playerResults.push(result);
      resultsByPlayer.set(result.playerId, playerResults);

      // Only this result's chart can change, the others keep their pp for the day
      const chartPp = chartPpByPlayer.get(result.playerId) ?? new Map<number, number>();
      chartPpByPlayer.set(result.playerId, chartPp);
      const pp = result.pp * ppAgeFactor(day - utcDay(result.gained));
      if (pp > (chartPp.get(result.sharedChartId) ?? 0)) {
        chartPp.set(result.sharedChartId, pp);
        if (updateTotal(result.playerId, result.gained)) {
          recordRanks(result.gained);
        }
      }
    }

    for (const [playerId, total] of totals) {
      const lastPp = lastPps.get(playerId);
      if (total > 0 && (lastPp === undefined || Math.abs(total - lastPp) >= 1)) {
        lastPps.set(playerId, total);
        ppRows.push({ player_id: playerId, recorded_at: changedAt.get(playerId)!, pp: total });
      }
    }
  }

  return { rankRows, ppRows };
};

/**
 * Replaces the whole pp and rank history with a replay of all results. Run once by
 * `npm run rebuild-pp-history`, after every result's pp and player's total are up to date.
 * From then on the effects job only appends to the history (recordStandings)
 */
export const rebuildPpHistory = async () => {
  const results = await db
    .selectFrom('results')
    .innerJoin('players', 'players.id', 'results.player_id')
    .select([
      'results.player_id as playerId',
      'results.shared_chart as sharedChartId',
      'results.pp',
      'results.gained',
    ])
    .where('results.pp', 'is not', null)
    .where('players.hidden', '=', 0)
    .orderBy('results.gained', 'asc')
    .orderBy('results.id', 'asc')
    .$narrowType<{ pp: number; playerId: number }>()
    .execute();
  debug(`Replaying ${results.length} results`);

  const { rankRows, ppRows } = replayPpHistory(results, utcDay(new Date()));
  debug(`Writing ${rankRows.length} rank rows and ${ppRows.length} pp rows`);

  await db.transaction().execute(async (trx) => {
    await trx.deleteFrom('player_rank_history').execute();
    await trx.deleteFrom('player_pp_history').execute();
    for (const rows of _.chunk(5000, rankRows)) {
      await trx.insertInto('player_rank_history').values(rows).execute();
    }
    for (const rows of _.chunk(5000, ppRows)) {
      await trx.insertInto('player_pp_history').values(rows).execute();
    }
  });

  return { rankRows: rankRows.length, ppRows: ppRows.length };
};
