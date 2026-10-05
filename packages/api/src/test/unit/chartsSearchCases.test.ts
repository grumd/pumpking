import type { Results, Tracks } from '@pumpking/database/database';
import { db } from '@pumpking/database/db';
import { assert } from 'chai';
import type { Insertable } from 'kysely';
import {
  type ChartViewModel,
  type ChartsSearchParams,
  searchCharts,
} from 'services/charts/chartsSearch';
import { getResultDefaults } from 'test/seeds/initialSeed';

// Every test builds the charts and results it needs: the seeded results are removed first.
// Seeded players: 1-4 visible, 5 hidden, 6 admin, 7. Seeded arcade names: every player in
// mix 26, player 2 in mix 28 (DUMMY2P2), player 3 in mix 27 (DUMMY3P)

const at = (minute: number) => new Date(Date.UTC(2026, 0, 1, 0, minute));

const addChart = async ({
  id,
  name = `Song ${id}`,
  duration = 'Standard',
  interpolated = null,
  instances,
}: {
  id: number;
  name?: string;
  duration?: Tracks['duration'];
  interpolated?: number | null;
  instances: Array<{ mix: number; label: string; level: number | null }>;
}) => {
  const type = instances[0].label.match(/^(COOP|HD|S|D)/)?.[1] as 'COOP' | 'HD' | 'S' | 'D';
  await db
    .insertInto('tracks')
    .values({ id, external_id: `${id}`, full_name: name, short_name: name, duration })
    .execute();
  await db
    .insertInto('shared_charts')
    .values({ id, track: id, index_in_track: 1, type, interpolated_difficulty: interpolated })
    .execute();
  await db
    .insertInto('chart_instances')
    .values(instances.map((instance) => ({ ...instance, track: id, shared_chart: id })))
    .execute();
};

// A chart with one instance in Phoenix 2
const addS20 = (id: number, extra: Partial<Parameters<typeof addChart>[0]> = {}) =>
  addChart({ id, instances: [{ mix: 28, label: 'S20', level: 20 }], ...extra });

const addResult = async ({
  player,
  chart,
  score,
  added,
  mix = 28,
  ...rest
}: {
  player: number;
  chart: number;
  score: number | null;
  added: Date;
  mix?: number;
} & Partial<Insertable<Results>>) => {
  const { insertId } = await db
    .insertInto('results')
    .values({
      ...getResultDefaults({ playerId: player, score: score ?? 0 }),
      score_phoenix: score,
      shared_chart: chart,
      mix,
      added,
      gained: added,
      ...rest,
    })
    .executeTakeFirstOrThrow();
  return Number(insertId);
};

const setPreferences = (
  playerId: number,
  preferences: {
    playersHiddenStatus?: Record<number, boolean>;
    hiddenRegions?: Record<string, boolean>;
  }
) =>
  db
    .updateTable('players')
    .set({
      preferences: JSON.stringify({
        showHiddenPlayersInRanking: false,
        playersHiddenStatus: {},
        hiddenRegions: {},
        ...preferences,
      }),
    })
    .where('id', '=', playerId)
    .execute();

const setRegion = (playerId: number, region: string | null) =>
  db.updateTable('players').set({ region }).where('id', '=', playerId).execute();

const search = (params: ChartsSearchParams = {}) => searchCharts({ limit: 100, ...params });

const ids = (charts: ChartViewModel[]) => charts.map((chart) => chart.id);
const sortedIds = (charts: ChartViewModel[]) => ids(charts).sort((a, b) => a - b);
const players = (chart: ChartViewModel) => chart.results.map((result) => result.playerId);

describe('Charts search cases', () => {
  beforeEach(async () => {
    await db.deleteFrom('results').execute();
  });

  describe('which charts are listed', () => {
    it('lists a chart once it has a result with a phoenix score', async () => {
      await addS20(101);
      await addS20(102);
      await addS20(103);
      await addResult({ player: 1, chart: 102, score: 900000, added: at(1) });
      await addResult({ player: 1, chart: 103, score: null, added: at(2) });

      assert.deepEqual(ids(await search()), [102]);
    });

    it('returns nothing when no mixes are selected', async () => {
      await addS20(101);
      await addResult({ player: 1, chart: 101, score: 900000, added: at(1) });

      assert.deepEqual(await search({ mixes: [] }), []);
    });

    it('only counts results from the selected mixes', async () => {
      await addChart({
        id: 101,
        instances: [
          { mix: 27, label: 'S20', level: 20 },
          { mix: 28, label: 'S20', level: 20 },
        ],
      });
      await addResult({ player: 1, chart: 101, score: 900000, added: at(1), mix: 27 });

      assert.deepEqual(ids(await search({ mixes: [28] })), []);
      assert.deepEqual(ids(await search({ mixes: [27] })), [101]);
      assert.deepEqual(ids(await search()), [101], 'default mixes are XX, Phoenix, Phoenix 2');
    });

    it('needs an instance of the chart in a selected mix', async () => {
      await addChart({ id: 101, instances: [{ mix: 25, label: 'S20', level: 20 }] });
      await addResult({ player: 1, chart: 101, score: 900000, added: at(1), mix: 25 });

      assert.deepEqual(ids(await search()), [], 'Prime 2 is not a default mix');
      assert.deepEqual(ids(await search({ mixes: [25] })), [101]);
    });

    it('leaves out hidden players', async () => {
      await addS20(101);
      await addS20(102);
      await addS20(103);
      await addResult({ player: 5, chart: 101, score: 999000, added: at(9) });
      await addResult({ player: 1, chart: 102, score: 900000, added: at(1) });
      await addResult({ player: 5, chart: 102, score: 999000, added: at(5) });
      await addResult({ player: 2, chart: 103, score: 900000, added: at(3) });

      const charts = await search();
      assert.deepEqual(ids(charts), [103, 102], "the hidden player's results don't move chart 102");
      assert.deepEqual(players(charts[1]), [1]);
      assert.equal(charts[1].updatedOn.getTime(), at(1).getTime());
    });
  });

  describe('chart fields', () => {
    beforeEach(async () => {
      await addChart({
        id: 101,
        name: 'Fields Song',
        duration: 'Full',
        instances: [
          { mix: 26, label: 'S19', level: 19 },
          { mix: 27, label: 'S20', level: 20 },
          { mix: 28, label: 'S21', level: 21 },
        ],
      });
    });

    it('describes the chart by its instance in the latest selected mix', async () => {
      await addResult({ player: 1, chart: 101, score: 900000, added: at(1), mix: 26 });
      await addResult({ player: 2, chart: 101, score: 800000, added: at(2), mix: 27 });
      await addResult({ player: 3, chart: 101, score: 700000, added: at(3), mix: 28 });
      await addResult({ player: 4, chart: 101, score: 600000, added: at(4), mix: 27 });

      const [chart] = await search();
      assert.include(chart, {
        id: 101,
        songName: 'Fields Song',
        duration: 'Full',
        label: 'S21',
        level: 21,
      });
      assert.deepEqual(
        chart.otherChartInstances,
        [
          { mix: 26, label: 'S19', level: 19 },
          { mix: 27, label: 'S20', level: 20 },
        ],
        'one entry per older mix that a shown result is from'
      );

      const [olderMixes] = await search({ mixes: [26, 27] });
      assert.include(olderMixes, { label: 'S20', level: 20 });
      assert.deepEqual(olderMixes.otherChartInstances, [{ mix: 26, label: 'S19', level: 19 }]);
      assert.deepEqual(players(olderMixes), [1, 2, 4]);
    });

    it('only lists other instances that a shown result is from', async () => {
      await addResult({ player: 1, chart: 101, score: 900000, added: at(1), mix: 28 });

      const [chart] = await search();
      assert.deepEqual(chart.otherChartInstances, []);
    });

    it('updatedOn is when the latest best score was set', async () => {
      await addResult({ player: 1, chart: 101, score: 900000, added: at(1) });
      await addResult({ player: 2, chart: 101, score: 700000, added: at(3) });
      await addResult({ player: 1, chart: 101, score: 800000, added: at(5) });

      const [chart] = await search();
      assert.equal(chart.updatedOn.getTime(), at(3).getTime());
    });
  });

  it('difficulty is the interpolated difficulty, or the level without one', async () => {
    await addS20(101, { interpolated: 20.5 });
    await addChart({ id: 102, instances: [{ mix: 28, label: 'S15', level: 15 }] });
    await addResult({ player: 1, chart: 101, score: 900000, added: at(2) });
    await addResult({ player: 1, chart: 102, score: 900000, added: at(1) });

    const [withInterpolated, withoutInterpolated] = await search();
    assert.include(withInterpolated, { difficulty: 20.5, interpolatedDifficulty: 20.5 });
    assert.include(withoutInterpolated, { difficulty: 15, interpolatedDifficulty: null });

    // Sorting by difficulty puts the level in interpolatedDifficulty too
    const [bySort] = await search({ sortChartsBy: 'difficulty', sortChartsDir: 'asc' });
    assert.include(bySort, { id: 102, difficulty: 15, interpolatedDifficulty: 15 });
  });

  describe('results on a chart', () => {
    beforeEach(async () => {
      await addChart({
        id: 101,
        instances: [
          { mix: 26, label: 'S20', level: 20 },
          { mix: 27, label: 'S20', level: 20 },
          { mix: 28, label: 'S20', level: 20 },
        ],
      });
    });

    it("shows each player's best score, highest first", async () => {
      await addResult({ player: 1, chart: 101, score: 800000, added: at(1) });
      const best = await addResult({ player: 1, chart: 101, score: 900000, added: at(2) });
      await addResult({ player: 1, chart: 101, score: 850000, added: at(3) });
      await addResult({ player: 2, chart: 101, score: 950000, added: at(4) });
      await addResult({ player: 3, chart: 101, score: 700000, added: at(5) });

      const [chart] = await search();
      assert.deepEqual(
        chart.results.map((r) => [r.playerId, r.score]),
        [
          [2, 950000],
          [1, 900000],
          [3, 700000],
        ]
      );
      assert.equal(chart.results[1].id, best);
    });

    it('of equal best scores, shows the earliest', async () => {
      const first = await addResult({ player: 1, chart: 101, score: 900000, added: at(1) });
      await addResult({ player: 1, chart: 101, score: 900000, added: at(2) });

      const [chart] = await search();
      assert.lengthOf(chart.results, 1);
      assert.equal(chart.results[0].id, first);
    });

    it('of equal scores of different players, shows the earlier result first', async () => {
      await addResult({ player: 1, chart: 101, score: 900000, added: at(3) });
      await addResult({ player: 2, chart: 101, score: 900000, added: at(1) });
      await addResult({ player: 3, chart: 101, score: 900000, added: at(2) });

      const [chart] = await search();
      assert.deepEqual(players(chart), [2, 3, 1]);
    });

    it("scoreIncrease is the gap to the player's next best score", async () => {
      await addResult({ player: 1, chart: 101, score: 800000, added: at(1) });
      await addResult({ player: 1, chart: 101, score: 900000, added: at(2) });
      await addResult({ player: 2, chart: 101, score: 900000, added: at(1) });
      await addResult({ player: 2, chart: 101, score: 900000, added: at(2) });
      await addResult({ player: 3, chart: 101, score: 900000, added: at(1) });
      // Played after the best one, and still counted
      await addResult({ player: 4, chart: 101, score: 900000, added: at(1) });
      await addResult({ player: 4, chart: 101, score: 850000, added: at(2) });

      const [chart] = await search();
      const increase = (playerId: number) =>
        chart.results.find((r) => r.playerId === playerId)?.scoreIncrease;
      assert.equal(increase(1), 100000);
      assert.equal(increase(2), 0, 'a tie with a later result');
      assert.isNull(increase(3), 'the only result');
      assert.equal(increase(4), 50000);
    });

    it('only shows results from the selected mixes, and the best among them', async () => {
      await addResult({ player: 1, chart: 101, score: 990000, added: at(1), mix: 27 });
      await addResult({ player: 1, chart: 101, score: 900000, added: at(2), mix: 28 });

      const [phoenix2] = await search({ mixes: [28] });
      assert.deepEqual(
        phoenix2.results.map((r) => [r.score, r.mix]),
        [[900000, 28]]
      );
      const [all] = await search();
      assert.deepEqual(
        all.results.map((r) => [r.score, r.mix]),
        [[990000, 27]]
      );
    });

    it('leaves out results from a mix the chart has no instance in', async () => {
      await addChart({
        id: 102,
        instances: [
          { mix: 27, label: 'S20', level: 20 },
          { mix: 28, label: 'S20', level: 20 },
        ],
      });
      await addResult({ player: 1, chart: 102, score: 900000, added: at(1) });
      await addResult({ player: 2, chart: 102, score: 950000, added: at(2), mix: 26 });

      const [chart] = await search({ sharedChartId: 102 });
      assert.deepEqual(players(chart), [1]);
    });

    it('returns every field of a result', async () => {
      await setRegion(2, 'UA');
      const id = await addResult({
        player: 2,
        chart: 101,
        // An XX-scale score, and its phoenix score
        score: 1950000,
        score_phoenix: 950000,
        added: at(5),
        gained: at(3),
        exact_gain_date: 0,
        perfects: 90,
        greats: 5,
        goods: 3,
        bads: 1,
        misses: 1,
        max_combo: 95,
        grade: 'S',
        plate: 'MG',
        is_pass: 1,
        mods_list: 'AV2 ',
        calories: 123,
        recognition_notes: 'personal_best',
        exp: '12.50',
        pp: 45.67,
      });

      const [chart] = await search();
      assert.deepEqual(chart.results, [
        {
          id,
          playerId: 2,
          playerName: 'Dummy 2',
          playerNameArcade: 'DUMMY2P2',
          score: 950000,
          originalScore: 1950000,
          scoreIncrease: null,
          pp: 45.67,
          added: at(5),
          gained: at(3),
          stats: [90, 5, 3, 1, 1],
          combo: 95,
          grade: 'S',
          plate: 'MG',
          passed: true,
          isExactGainedDate: false,
          mods: 'AV2 ',
          calories: 123,
          region: 'UA',
          mix: 28,
          exp: 12.5,
          isHidden: false,
          recognitionType: 'personal_best',
          countsForTournament: false,
        },
      ]);
    });

    it('maps passed, recognition type, exp and the arcade name', async () => {
      const values: Array<[number, number | null, string, string | null]> = [
        // player, is_pass, recognition_notes, exp
        [1, 0, 'manual', null],
        [2, null, 'result', '0.00'],
        [3, 1, 'machine_best', '1.00'],
        [4, 1, '', null],
        [6, 1, 'something else', null],
      ];
      for (const [player, isPass, notes, exp] of values) {
        await addResult({
          player,
          chart: 101,
          score: 900000 - player,
          added: at(player),
          is_pass: isPass,
          recognition_notes: notes,
          exp,
        });
      }

      const [chart] = await search();
      assert.deepEqual(
        chart.results.map((r) => [
          r.playerId,
          r.passed,
          r.recognitionType,
          r.exp,
          r.playerNameArcade,
        ]),
        [
          [1, false, 'manual', null, null],
          [2, null, 'result', 0, 'DUMMY2P2'],
          [3, true, 'machine_best', 1, null],
          [4, true, null, null, null],
          [6, true, null, null, null],
        ]
      );
    });

    it('takes the arcade name from the mix of the result', async () => {
      await addResult({ player: 3, chart: 101, score: 900000, added: at(1), mix: 27 });
      await addResult({ player: 1, chart: 101, score: 800000, added: at(2), mix: 26 });

      const [chart] = await search();
      assert.deepEqual(
        chart.results.map((r) => r.playerNameArcade),
        ['DUMMY3P', 'DUMMY1']
      );
    });
  });

  describe("the viewer's preferences", () => {
    beforeEach(async () => {
      await addS20(101);
      await addS20(102);
      await addS20(103);
      await addS20(104);
    });

    it("lists the viewer's hidden players, marked, but doesn't let them list or move charts", async () => {
      await setPreferences(6, { playersHiddenStatus: { 2: true, 3: false } });
      await addResult({ player: 1, chart: 101, score: 900000, added: at(1) });
      await addResult({ player: 2, chart: 101, score: 950000, added: at(5) });
      await addResult({ player: 3, chart: 102, score: 900000, added: at(3) });
      await addResult({ player: 2, chart: 103, score: 900000, added: at(4) });

      assert.deepEqual(ids(await search()), [101, 103, 102]);

      const charts = await search({ currentPlayerId: 6 });
      assert.deepEqual(ids(charts), [102, 101]);
      assert.deepEqual(
        charts[1].results.map((r) => [r.playerId, r.isHidden]),
        [
          [2, true],
          [1, false],
        ]
      );
      assert.equal(charts[1].updatedOn.getTime(), at(1).getTime());
    });

    it("lists players from the viewer's hidden regions, marked, but doesn't let them list or move charts", async () => {
      await setRegion(1, 'UA');
      await setRegion(2, 'PL');
      await setRegion(3, 'US');
      await setPreferences(6, { hiddenRegions: { PL: true, US: false } });
      await addResult({ player: 1, chart: 101, score: 900000, added: at(1) });
      await addResult({ player: 2, chart: 101, score: 950000, added: at(5) });
      await addResult({ player: 3, chart: 102, score: 900000, added: at(3) });
      await addResult({ player: 2, chart: 103, score: 900000, added: at(4) });
      // Player 4 has no region
      await addResult({ player: 4, chart: 104, score: 900000, added: at(2) });

      const charts = await search({ currentPlayerId: 6 });
      assert.deepEqual(ids(charts), [102, 104, 101]);
      assert.deepEqual(
        charts[2].results.map((r) => [r.playerId, r.isHidden]),
        [
          [2, true],
          [1, false],
        ]
      );
    });

    it('shows a viewer without preferences what anyone sees', async () => {
      await addResult({ player: 1, chart: 101, score: 900000, added: at(1) });
      await addResult({ player: 2, chart: 102, score: 900000, added: at(2) });

      assert.deepEqual(await search({ currentPlayerId: 1 }), await search());
    });

    it('shows a hidden viewer only their own results', async () => {
      await addResult({ player: 1, chart: 101, score: 950000, added: at(1) });
      await addResult({ player: 5, chart: 101, score: 900000, added: at(2) });
      await addResult({ player: 1, chart: 102, score: 900000, added: at(3) });

      const charts = await search({ currentPlayerId: 5 });
      assert.deepEqual(ids(charts), [101]);
      assert.deepEqual(players(charts[0]), [5]);
    });

    it('fails for a viewer that does not exist', async () => {
      let error: unknown;
      try {
        await search({ currentPlayerId: 999 });
      } catch (e) {
        error = e;
      }
      assert.exists(error);
    });
  });

  describe('chart filters', () => {
    it('labels: by the start of the label', async () => {
      await addS20(101);
      await addChart({ id: 102, instances: [{ mix: 28, label: 'D20', level: 20 }] });
      await addChart({ id: 103, instances: [{ mix: 28, label: 'HD18', level: 18 }] });
      await addChart({ id: 104, instances: [{ mix: 28, label: 'COOP2', level: 0 }] });
      for (const chart of [101, 102, 103, 104]) {
        await addResult({ player: 1, chart, score: 900000, added: at(1) });
      }

      assert.deepEqual(sortedIds(await search({ labels: ['S'] })), [101]);
      assert.deepEqual(sortedIds(await search({ labels: ['D'] })), [102], 'D is not HD');
      assert.deepEqual(sortedIds(await search({ labels: ['HD'] })), [103]);
      assert.deepEqual(sortedIds(await search({ labels: ['COOP'] })), [104]);
      assert.deepEqual(sortedIds(await search({ labels: ['S', 'HD'] })), [101, 103]);
      assert.deepEqual(sortedIds(await search({ labels: [] })), [101, 102, 103, 104]);
      assert.deepEqual(sortedIds(await search()), [101, 102, 103, 104]);
    });

    it('levels: inclusive, from 0 to 30 by default, always passing co-op charts', async () => {
      await addChart({ id: 101, instances: [{ mix: 28, label: 'S10', level: 10 }] });
      await addChart({ id: 102, instances: [{ mix: 28, label: 'S15', level: 15 }] });
      await addChart({ id: 103, instances: [{ mix: 28, label: 'S20', level: 20 }] });
      await addChart({ id: 104, instances: [{ mix: 28, label: 'COOP3', level: 0 }] });
      await addChart({ id: 105, instances: [{ mix: 28, label: 'S', level: null }] });
      await addChart({ id: 106, instances: [{ mix: 28, label: 'S29', level: 29 }] });
      for (const chart of [101, 102, 103, 104, 105, 106]) {
        await addResult({ player: 1, chart, score: 900000, added: at(1) });
      }

      assert.deepEqual(sortedIds(await search({ minLevel: 15, maxLevel: 20 })), [102, 103, 104]);
      assert.deepEqual(sortedIds(await search({ minLevel: 15 })), [102, 103, 104, 106]);
      assert.deepEqual(sortedIds(await search({ maxLevel: 15 })), [101, 102, 104]);
      assert.deepEqual(
        sortedIds(await search({ minLevel: 1, maxLevel: 28 })),
        [101, 102, 103, 104]
      );
      assert.deepEqual(
        sortedIds(await search()),
        [101, 102, 103, 104, 105, 106],
        'without a level filter, charts without a level too'
      );
      assert.deepEqual(
        sortedIds(await search({ minLevel: 0 })),
        [101, 102, 103, 104, 105, 106],
        'level 0 is no filter'
      );
    });

    it('labels and levels: from the instance in the latest selected mix', async () => {
      await addChart({
        id: 101,
        instances: [
          { mix: 27, label: 'S17', level: 17 },
          { mix: 28, label: 'S18', level: 18 },
        ],
      });
      await addResult({ player: 1, chart: 101, score: 900000, added: at(1), mix: 27 });

      assert.deepEqual(ids(await search({ minLevel: 18 })), [101]);
      assert.deepEqual(ids(await search({ minLevel: 18, mixes: [26, 27] })), []);
      assert.deepEqual(ids(await search({ maxLevel: 17, mixes: [26, 27] })), [101]);
    });

    it('durations: any of them', async () => {
      await addS20(101, { duration: 'Standard' });
      await addS20(102, { duration: 'Full' });
      await addS20(103, { duration: 'Short' });
      await addS20(104, { duration: 'Remix' });
      for (const chart of [101, 102, 103, 104]) {
        await addResult({ player: 1, chart, score: 900000, added: at(1) });
      }

      assert.deepEqual(sortedIds(await search({ durations: ['Full', 'Short'] })), [102, 103]);
      assert.deepEqual(sortedIds(await search({ durations: [] })), [101, 102, 103, 104]);
    });

    describe('song name', () => {
      beforeEach(async () => {
        await addChart({
          id: 101,
          name: 'Matador',
          instances: [{ mix: 28, label: 'S22', level: 22 }],
        });
        await addChart({
          id: 102,
          name: 'Love is a Danger Zone',
          instances: [{ mix: 28, label: 'D22', level: 22 }],
        });
        await addChart({
          id: 103,
          name: 'Danger',
          instances: [{ mix: 28, label: 'S10', level: 10 }],
        });
        for (const chart of [101, 102, 103]) {
          await addResult({ player: 1, chart, score: 900000, added: at(1) });
        }
      });

      it('matches words of the name and label in order, ignoring case', async () => {
        const find = async (songName: string) => sortedIds(await search({ songName }));
        assert.deepEqual(await find('matador'), [101]);
        assert.deepEqual(await find('MaTaDoR'), [101]);
        assert.deepEqual(await find('l i a d z'), [102]);
        assert.deepEqual(await find('danger'), [102, 103]);
        assert.deepEqual(await find('zone danger'), [], 'words in the wrong order');
        assert.deepEqual(await find('danger d22'), [102], 'name and label');
        assert.deepEqual(await find('s10'), [103]);
        assert.deepEqual(await find('  '), [101, 102, 103]);
        assert.deepEqual(await find(''), [101, 102, 103]);
      });

      it('matches % and _ as themselves', async () => {
        await addS20(104, { name: '50% Chance' });
        await addS20(105, { name: 'X_Y' });
        await addS20(106, { name: 'XAY' });
        for (const chart of [104, 105, 106]) {
          await addResult({ player: 1, chart, score: 900000, added: at(1) });
        }
        const find = async (songName: string) => sortedIds(await search({ songName }));
        assert.deepEqual(await find('%'), [104]);
        assert.deepEqual(await find('50%'), [104]);
        assert.deepEqual(await find('x_y'), [105]);
        assert.deepEqual(await find('\\'), []);
      });

      it('only finds a quote in names with a quote', async () => {
        await addS20(104, { name: "Don't Bother Me" });
        await addResult({ player: 1, chart: 104, score: 900000, added: at(1) });

        assert.deepEqual(sortedIds(await search({ songName: "'" })), [104]);
      });
    });

    describe('players', () => {
      beforeEach(async () => {
        await addS20(101);
        await addS20(102);
        await addS20(103);
        await addS20(104);
        await addResult({ player: 1, chart: 101, score: 900000, added: at(1) });
        await addResult({ player: 2, chart: 101, score: 900000, added: at(1) });
        await addResult({ player: 2, chart: 102, score: 900000, added: at(1) });
        await addResult({ player: 3, chart: 102, score: 900000, added: at(1) });
        await addResult({ player: 3, chart: 103, score: 900000, added: at(1) });
        await addResult({ player: 4, chart: 104, score: 900000, added: at(1) });
      });

      it('some, none and all of the players', async () => {
        const find = async (params: ChartsSearchParams) => sortedIds(await search(params));
        assert.deepEqual(await find({ playersSome: [1, 3] }), [101, 102, 103]);
        assert.deepEqual(await find({ playersNone: [2] }), [103, 104]);
        assert.deepEqual(await find({ playersAll: [2, 3] }), [102]);
        assert.deepEqual(await find({ playersAll: [2], playersNone: [1] }), [102]);
        assert.deepEqual(await find({ playersAll: [2], playersSome: [1, 4] }), [101]);
        assert.deepEqual(await find({ playersSome: [1], playersNone: [1] }), []);
        assert.deepEqual(
          await find({ playersSome: [], playersNone: [], playersAll: [] }),
          [101, 102, 103, 104]
        );
      });

      it('only count results with a phoenix score in the selected mixes', async () => {
        await addChart({
          id: 105,
          instances: [
            { mix: 27, label: 'S20', level: 20 },
            { mix: 28, label: 'S20', level: 20 },
          ],
        });
        await addResult({ player: 4, chart: 105, score: 900000, added: at(1) });
        await addResult({ player: 1, chart: 105, score: 900000, added: at(1), mix: 27 });
        await addResult({ player: 2, chart: 105, score: null, added: at(1) });

        const find = async (params: ChartsSearchParams) => sortedIds(await search(params));
        assert.deepEqual(await find({ playersSome: [1] }), [101, 105]);
        assert.deepEqual(await find({ playersSome: [1], mixes: [28] }), [101]);
        assert.deepEqual(await find({ playersAll: [1], mixes: [28] }), [101]);
        assert.deepEqual(await find({ playersNone: [1], mixes: [28] }), [102, 103, 104, 105]);
        assert.deepEqual(await find({ playersAll: [2] }), [101, 102], 'no phoenix score');
      });

      it("count hidden players and the viewer's hidden players", async () => {
        await addResult({ player: 5, chart: 104, score: 990000, added: at(1) });
        await setPreferences(6, { playersHiddenStatus: { 2: true } });

        assert.deepEqual(sortedIds(await search({ playersSome: [5] })), [104]);
        assert.deepEqual(sortedIds(await search({ playersNone: [5] })), [101, 102, 103]);
        assert.deepEqual(
          sortedIds(await search({ playersSome: [2], currentPlayerId: 6 })),
          [101, 102]
        );
        assert.deepEqual(
          sortedIds(await search({ playersNone: [2], currentPlayerId: 6 })),
          [103, 104]
        );
      });
    });

    it('one chart by its id, with the other filters still applied', async () => {
      await addS20(101);
      await addChart({ id: 102, instances: [{ mix: 27, label: 'S20', level: 20 }] });
      await addResult({ player: 1, chart: 101, score: 900000, added: at(1) });
      await addResult({ player: 1, chart: 102, score: 900000, added: at(2), mix: 27 });

      assert.deepEqual(ids(await search({ sharedChartId: 101 })), [101]);
      assert.deepEqual(ids(await search({ sharedChartId: 101, labels: ['D'] })), []);
      assert.deepEqual(ids(await search({ sharedChartId: 102, mixes: [28] })), []);
      assert.deepEqual(ids(await search({ sharedChartId: 999 })), []);
    });
  });

  describe('sorting', () => {
    beforeEach(async () => {
      await addS20(101);
      await addS20(102);
      await addS20(103);
    });

    it('by date, newest or oldest first', async () => {
      await addResult({ player: 1, chart: 101, score: 900000, added: at(1) });
      await addResult({ player: 1, chart: 102, score: 900000, added: at(3) });
      await addResult({ player: 1, chart: 103, score: 900000, added: at(2) });

      assert.deepEqual(ids(await search()), [102, 103, 101], 'newest first by default');
      assert.deepEqual(
        ids(await search({ sortChartsBy: 'date', sortChartsDir: 'desc' })),
        [102, 103, 101]
      );
      assert.deepEqual(
        ids(await search({ sortChartsBy: 'date', sortChartsDir: 'asc' })),
        [101, 103, 102]
      );
    });

    it("by date: a result that doesn't beat the player's best doesn't move the chart", async () => {
      await addResult({ player: 1, chart: 101, score: 900000, added: at(1) });
      await addResult({ player: 2, chart: 102, score: 900000, added: at(3) });
      await addResult({ player: 1, chart: 101, score: 800000, added: at(5) });
      await addResult({ player: 1, chart: 101, score: 900000, added: at(6) });

      const charts = await search();
      assert.deepEqual(ids(charts), [102, 101]);
      assert.equal(charts[1].updatedOn.getTime(), at(1).getTime());
    });

    it("by date: a new best, or a player's first result, moves the chart up", async () => {
      await addResult({ player: 1, chart: 101, score: 900000, added: at(1) });
      await addResult({ player: 2, chart: 102, score: 900000, added: at(3) });
      await addResult({ player: 1, chart: 101, score: 950000, added: at(5) });
      assert.deepEqual(ids(await search()), [101, 102]);

      await addResult({ player: 2, chart: 102, score: 950000, added: at(6) });
      assert.deepEqual(ids(await search()), [102, 101]);

      await addResult({ player: 3, chart: 101, score: 100000, added: at(7) });
      assert.deepEqual(ids(await search()), [101, 102]);
    });

    it('by date: the latest best within the selected mixes', async () => {
      await addChart({
        id: 104,
        instances: [
          { mix: 27, label: 'S20', level: 20 },
          { mix: 28, label: 'S20', level: 20 },
        ],
      });
      await addResult({ player: 1, chart: 104, score: 900000, added: at(1), mix: 28 });
      await addResult({ player: 1, chart: 104, score: 950000, added: at(5), mix: 27 });
      await addResult({ player: 2, chart: 101, score: 900000, added: at(3), mix: 28 });

      assert.deepEqual(ids(await search({ mixes: [28] })), [101, 104]);
      assert.deepEqual(ids(await search()), [104, 101]);
    });

    it('by date: a tie in a selected mix with an earlier best in another mix moves the chart', async () => {
      await addChart({
        id: 104,
        instances: [
          { mix: 27, label: 'S20', level: 20 },
          { mix: 28, label: 'S20', level: 20 },
        ],
      });
      await addResult({ player: 1, chart: 104, score: 1000000, added: at(1), mix: 27 });
      await addResult({ player: 2, chart: 101, score: 900000, added: at(3), mix: 28 });
      await addResult({ player: 1, chart: 104, score: 1000000, added: at(5), mix: 28 });

      assert.deepEqual(
        ids(await search({ mixes: [28] })),
        [104, 101],
        'its first best in Phoenix 2'
      );
      assert.deepEqual(ids(await search()), [101, 104]);
    });

    it('by pp: the highest pp of the best results, charts without pp last', async () => {
      await addResult({ player: 1, chart: 101, score: 900000, added: at(1), pp: 50 });
      await addResult({ player: 2, chart: 101, score: 800000, added: at(1), pp: 20 });
      await addResult({ player: 1, chart: 102, score: 900000, added: at(1), pp: 30 });
      await addResult({ player: 1, chart: 103, score: 900000, added: at(1), pp: null });

      assert.deepEqual(
        ids(await search({ sortChartsBy: 'pp', sortChartsDir: 'desc' })),
        [101, 102, 103]
      );
      assert.deepEqual(
        ids(await search({ sortChartsBy: 'pp', sortChartsDir: 'asc' })),
        [103, 102, 101]
      );
    });

    it('by pp: only the best results count', async () => {
      await addResult({ player: 1, chart: 101, score: 800000, added: at(1), pp: 100 });
      await addResult({ player: 1, chart: 101, score: 900000, added: at(2), pp: 10 });
      await addResult({ player: 1, chart: 101, score: 900000, added: at(3), pp: 90 });
      await addResult({ player: 2, chart: 102, score: 900000, added: at(1), pp: 50 });

      assert.deepEqual(
        ids(await search({ sortChartsBy: 'pp', sortChartsDir: 'desc' })),
        [102, 101]
      );
    });

    it('by pp: a tie from a mix that is not selected does not count', async () => {
      await addChart({
        id: 104,
        instances: [
          { mix: 27, label: 'S20', level: 20 },
          { mix: 28, label: 'S20', level: 20 },
        ],
      });
      await addResult({ player: 1, chart: 104, score: 1000000, added: at(1), mix: 27, pp: 80 });
      await addResult({ player: 1, chart: 104, score: 1000000, added: at(2), mix: 28 });
      await addResult({ player: 2, chart: 101, score: 900000, added: at(1), mix: 28, pp: 50 });

      const byPp = { sortChartsBy: 'pp', sortChartsDir: 'desc' } as const;
      assert.deepEqual(ids(await search({ ...byPp, mixes: [28] })), [101, 104]);
      assert.deepEqual(ids(await search(byPp)), [104, 101]);
    });

    it('by difficulty: the interpolated difficulty, or the level without one', async () => {
      await addChart({
        id: 104,
        interpolated: 20.5,
        instances: [{ mix: 28, label: 'S20', level: 20 }],
      });
      await addChart({ id: 105, instances: [{ mix: 28, label: 'S21', level: 21 }] });
      await addChart({
        id: 106,
        interpolated: 19.5,
        instances: [{ mix: 28, label: 'S20', level: 20 }],
      });
      await addChart({ id: 107, instances: [{ mix: 28, label: 'COOP2', level: 0 }] });
      await addChart({
        id: 108,
        instances: [
          { mix: 27, label: 'S12', level: 12 },
          { mix: 28, label: 'S25', level: 25 },
        ],
      });
      for (const chart of [104, 105, 106, 107]) {
        await addResult({ player: 1, chart, score: 900000, added: at(1) });
      }
      await addResult({ player: 1, chart: 108, score: 900000, added: at(1), mix: 27 });

      const byDifficulty = (sortChartsDir: 'asc' | 'desc', mixes?: number[]) =>
        search({ sortChartsBy: 'difficulty', sortChartsDir, mixes });
      assert.deepEqual(ids(await byDifficulty('asc')), [107, 106, 104, 105, 108]);
      assert.deepEqual(ids(await byDifficulty('desc')), [108, 105, 104, 106, 107]);
      const [phoenix] = await byDifficulty('asc', [26, 27]);
      assert.include(phoenix, { id: 108, difficulty: 12 }, 'the Phoenix level');
    });

    it('sortChartsByPlayers: only charts they played, by their best results', async () => {
      await addResult({ player: 1, chart: 101, score: 900000, added: at(1), pp: 10 });
      await addResult({ player: 2, chart: 101, score: 950000, added: at(5), pp: 50 });
      await addResult({ player: 2, chart: 102, score: 900000, added: at(3), pp: 30 });
      await addResult({ player: 3, chart: 103, score: 900000, added: at(4), pp: 40 });
      await addResult({ player: 1, chart: 102, score: 800000, added: at(6), pp: 5 });

      const byDate = await search({ sortChartsByPlayers: [1] });
      assert.deepEqual(ids(byDate), [102, 101]);
      assert.equal(byDate[1].updatedOn.getTime(), at(1).getTime(), "player 1's date");
      assert.deepEqual(players(byDate[1]), [2, 1], 'everyone is still on the leaderboard');

      assert.deepEqual(ids(await search({ sortChartsByPlayers: [1, 2] })), [102, 101]);
      assert.deepEqual(ids(await search({ sortChartsByPlayers: [3], sortChartsDir: 'asc' })), [
        103,
      ]);

      const byPp = { sortChartsBy: 'pp', sortChartsDir: 'desc' } as const;
      assert.deepEqual(ids(await search({ ...byPp, sortChartsByPlayers: [1] })), [101, 102]);
      assert.deepEqual(ids(await search({ ...byPp, sortChartsByPlayers: [1, 2] })), [101, 102]);
      assert.deepEqual(
        ids(await search({ ...byPp, sortChartsByPlayers: [2, 3] })),
        [101, 103, 102]
      );
      assert.deepEqual(
        ids(await search({ sortChartsBy: 'difficulty', sortChartsByPlayers: [3] })),
        [103]
      );
    });

    it('charts with the same sort value: by id, in the same direction', async () => {
      for (const chart of [101, 102, 103]) {
        await addResult({ player: 1, chart, score: 900000, added: at(1), pp: 10 });
      }

      for (const sortChartsBy of ['date', 'pp', 'difficulty'] as const) {
        assert.deepEqual(
          ids(await search({ sortChartsBy, sortChartsDir: 'desc' })),
          [103, 102, 101]
        );
        assert.deepEqual(
          ids(await search({ sortChartsBy, sortChartsDir: 'asc' })),
          [101, 102, 103]
        );
      }
    });
  });

  describe('pages', () => {
    beforeEach(async () => {
      for (let chart = 101; chart <= 112; chart++) {
        await addS20(chart);
      }
    });

    it('limit and offset, 10 from the start by default', async () => {
      for (let chart = 101; chart <= 112; chart++) {
        await addResult({ player: 1, chart, score: 900000, added: at(chart - 100) });
      }

      assert.deepEqual(
        ids(await searchCharts({})),
        [112, 111, 110, 109, 108, 107, 106, 105, 104, 103]
      );
      assert.deepEqual(ids(await search({ limit: 2 })), [112, 111]);
      assert.deepEqual(ids(await search({ limit: 2, offset: 2 })), [110, 109]);
      assert.deepEqual(ids(await search({ limit: 5, offset: 10 })), [102, 101]);
      assert.deepEqual(ids(await search({ limit: 5, offset: 12 })), []);
    });

    it('no chart is repeated or skipped when sort values are equal', async () => {
      for (let chart = 101; chart <= 112; chart++) {
        await addResult({ player: 1, chart, score: 900000, added: at(1) });
      }

      for (const sortChartsBy of ['date', 'pp', 'difficulty'] as const) {
        const pages: number[] = [];
        for (let offset = 0; offset < 12; offset += 5) {
          pages.push(...ids(await search({ sortChartsBy, limit: 5, offset })));
        }
        assert.deepEqual(pages, [112, 111, 110, 109, 108, 107, 106, 105, 104, 103, 102, 101]);
      }
    });
  });
});
