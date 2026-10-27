import { db } from '@pumpking/database/db';
import { assert } from 'chai';
import { updateAllPp } from 'services/charts/chartDifficultyInterpolation';
import { getPlayerPpHistory, recordStandings } from 'services/players/playersPp';
import { rebuildPpHistory, replayPpHistory } from 'services/players/ppHistoryRebuild';
import {
  getCountedCharts,
  getTotalPp,
  getTotalPpWithoutAge,
  ppAgeFactor,
  utcDay,
  utcDayStart,
} from 'services/players/totalPp';

const day0 = utcDay(new Date('2020-01-01T00:00:00Z'));
const at = (day: number, hour: number) => new Date((day0 + day) * 86_400_000 + hour * 3_600_000);

const countRows = async () => ({
  ranks: (await db.selectFrom('player_rank_history').select('id').execute()).length,
  pps: (await db.selectFrom('player_pp_history').select('id').execute()).length,
});

describe('Total pp', () => {
  it('lowers the pp of old results', () => {
    assert.strictEqual(ppAgeFactor(0), 1);
    assert.strictEqual(ppAgeFactor(365), 1, 'full pp for a year');
    assert.closeTo(ppAgeFactor(365 * 1.5), 0.875, 1e-9);
    assert.closeTo(ppAgeFactor(365 * 2), 0.75, 1e-9);
    assert.closeTo(ppAgeFactor(365 * 3.5), 0.5, 1e-9);
    assert.closeTo(ppAgeFactor(365 * 5), 0.25, 1e-9);
    assert.strictEqual(ppAgeFactor(365 * 10), 0.25, 'never below 25%');
  });

  it('counts the result with the most pp after its age on each chart', () => {
    const today = day0 + 365 * 5;
    const results = [
      { sharedChartId: 1, pp: 100, gained: at(0, 12) },
      { sharedChartId: 1, pp: 50, gained: utcDayStart(today) },
    ];
    assert.strictEqual(getTotalPp(results, today), 50, 'the recent result counts, 50 > 100 * 25%');
    assert.strictEqual(getTotalPp(results.slice(0, 1), today), 25, 'the old best alone');
  });

  it('weights the charts by their place after the age factor', () => {
    const today = day0 + 365 * 5;
    const results = [
      { sharedChartId: 1, pp: 100, gained: at(0, 12) },
      { sharedChartId: 2, pp: 50, gained: utcDayStart(today) },
    ];
    assert.closeTo(getTotalPp(results, today), 50 + 0.95 * 25, 1e-9);
  });
  it('adds up the best full pp of each chart for the total without age', () => {
    const results = [
      { sharedChartId: 1, pp: 100, gained: at(0, 12) },
      { sharedChartId: 1, pp: 50, gained: at(1, 12) },
      { sharedChartId: 2, pp: 60, gained: at(2, 12) },
    ];
    assert.closeTo(getTotalPpWithoutAge(results), 100 + 0.95 * 60, 1e-9);
  });

  it('lists the counted charts by what they add, with the weight of their place', () => {
    const today = day0 + 365 * 5;
    const old = { sharedChartId: 1, pp: 100, gained: at(0, 12) };
    const recent = { sharedChartId: 2, pp: 50, gained: utcDayStart(today) };
    const counted = getCountedCharts([old, recent], today);
    assert.deepEqual(counted, [
      { result: recent, pp: 50, weight: 1 },
      { result: old, pp: 25, weight: 0.95 },
    ]);
  });
});

describe('pp history replay', () => {
  it('records every change of place when it happened, even for a few minutes', () => {
    const { rankRows, ppRows } = replayPpHistory(
      [
        { playerId: 1, sharedChartId: 1, pp: 100, gained: at(0, 10) },
        { playerId: 2, sharedChartId: 1, pp: 90, gained: at(0, 11) },
        { playerId: 2, sharedChartId: 2, pp: 120, gained: at(0, 12) },
        { playerId: 1, sharedChartId: 2, pp: 200, gained: at(0, 13) },
      ],
      day0
    );

    assert.deepEqual(rankRows, [
      { player_id: 1, recorded_at: at(0, 10), rank: 1 },
      { player_id: 2, recorded_at: at(0, 11), rank: 2 },
      { player_id: 2, recorded_at: at(0, 12), rank: 1 },
      { player_id: 1, recorded_at: at(0, 12), rank: 2 },
      { player_id: 1, recorded_at: at(0, 13), rank: 1 },
      { player_id: 2, recorded_at: at(0, 13), rank: 2 },
    ]);
    assert.deepEqual(ppRows, [
      { player_id: 1, recorded_at: at(0, 13), pp: 295 },
      { player_id: 2, recorded_at: at(0, 12), pp: 205.5 },
    ]);
  });

  it('records the places that change as results get older, at midnight', () => {
    const today = day0 + 365 * 2;
    const { rankRows, ppRows } = replayPpHistory(
      [
        { playerId: 1, sharedChartId: 1, pp: 300, gained: at(0, 10) },
        { playerId: 2, sharedChartId: 1, pp: 250, gained: at(365, 10) },
      ],
      today
    );

    // Player 1's 300pp is 250pp at 1 year and 2/3 old
    const overtake = rankRows.filter((row) => row.player_id === 2 && row.rank === 1);
    assert.lengthOf(overtake, 1);
    assert.strictEqual(overtake[0].recorded_at.getTime() % 86_400_000, 0, 'at midnight');
    assert.isAbove(overtake[0].recorded_at.getTime(), at(365 + 240, 0).getTime());
    assert.isBelow(overtake[0].recorded_at.getTime(), at(365 + 250, 0).getTime());

    const player1Pps = ppRows.filter((row) => row.player_id === 1);
    assert.strictEqual(player1Pps[0].pp, 300);
    assert.closeTo(player1Pps.at(-1)!.pp, 225, 1, '75% at 2 years old');
    player1Pps.slice(1).forEach((row, index) => {
      assert.isAtLeast(player1Pps[index].pp - row.pp, 1, 'a pp row when the total moved 1pp');
    });
    const days = player1Pps.map((row) => utcDay(row.recorded_at));
    assert.deepEqual(days, [...new Set(days)], 'at most one pp row a day');
  });

  it('ends where the live totals are, so recording them adds nothing', async () => {
    await updateAllPp();
    await rebuildPpHistory();
    const rebuilt = await countRows();
    assert.isAbove(rebuilt.ranks, 0);
    assert.isAbove(rebuilt.pps, 0);

    await recordStandings();

    assert.deepEqual(await countRows(), rebuilt);
  });
});

describe('recordStandings', () => {
  it('appends the places and totals that changed', async () => {
    await updateAllPp();
    await recordStandings();
    const first = await countRows();
    assert.isAbove(first.ranks, 1);

    // Player 4 goes from last to first
    await db.updateTable('players').set({ pp: 10_000 }).where('id', '=', 4).execute();
    await recordStandings();

    const ranks = await db
      .selectFrom('player_rank_history')
      .select(['player_id', 'rank'])
      .orderBy('id')
      .offset(first.ranks)
      .limit(100)
      .execute();
    assert.deepInclude(ranks, { player_id: 4, rank: 1 });
    const ppRows = (await countRows()).pps - first.pps;
    assert.strictEqual(ppRows, 1, 'only player 4 has a new total');

    const history = await getPlayerPpHistory(4);
    assert.strictEqual(history.rankHistory.at(-1)!.rank, 1, 'the place goes on to now');
    assert.strictEqual(history.history.at(-1)!.pp, 10_000);
  });
});
