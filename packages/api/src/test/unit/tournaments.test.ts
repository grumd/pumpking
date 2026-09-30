import { assert } from 'chai';
import { TOURNAMENT_BRACKETS } from 'constants/tournaments';
import { db } from 'db';
import { sql } from 'kysely';
import { poolChartIds } from 'services/tournaments/eligibility';
import { createTournament, endTournaments } from 'services/tournaments/lifecycle';
import { bracketForSkill, rankLeaderboard, skillLevel } from 'services/tournaments/rules';
import { getTournament } from 'services/tournaments/tournament';
import { req } from 'test/helpers';
import { getResultDefaults } from 'test/seeds/initialSeed';

const MIXES = [26, 27, 28];
const LEVELS = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
const PER_SLOT = 4;

// Pool charts: 4 singles and 4 doubles per ID level 11-22, each in all 3 mixes,
// with an official level that drifts per mix.
const poolCharts = LEVELS.flatMap((level) =>
  (['S', 'D'] as const).flatMap((type) =>
    Array.from({ length: PER_SLOT }, (_, i) => ({
      id: 1000 + level * 10 + (type === 'D' ? 5 : 0) + i,
      level,
      type,
    }))
  )
);
const chartAt = (level: number, type: 'S' | 'D', i = 0) =>
  poolCharts.find((c) => c.level === level && c.type === type && c.id % 5 === i)!.id;

const instanceId = (sharedChartId: number, mix: number) => sharedChartId * 100 + mix;

const seedPool = async () => {
  const charts = [
    ...poolCharts.map((c) => ({ ...c, mixes: MIXES })),
    // not in every supported mix
    { id: 2001, level: 13, type: 'S' as const, mixes: [26, 27] },
    // wrong types
    { id: 2002, level: 13, type: 'COOP' as const, mixes: MIXES },
    { id: 2003, level: 13, type: 'HD' as const, mixes: MIXES },
  ];
  await db
    .insertInto('shared_charts')
    .values(
      charts.map((c) => ({
        id: c.id,
        track: 1,
        index_in_track: c.id,
        type: c.type,
        interpolated_difficulty: c.level + 0.4,
      }))
    )
    .execute();
  await db
    .insertInto('chart_instances')
    .values(
      charts.flatMap((c) =>
        c.mixes.map((mix) => ({
          id: instanceId(c.id, mix),
          track: 1,
          shared_chart: c.id,
          mix,
          label: `${c.type}${c.level + mix - 26}`,
          level: c.level + mix - 26,
          max_total_steps: 100,
          min_total_steps: 100,
        }))
      )
    )
    .execute();
};

const addResult = (
  playerId: number,
  sharedChartId: number,
  score: number,
  gained: string,
  extra: Partial<{ mix: number; exact_gain_date: 0 | 1; mods_list: string; is_hidden: number }> = {}
) => {
  const mix = extra.mix ?? 27;
  return db
    .insertInto('results')
    .values({
      ...getResultDefaults({ playerId, score }),
      ...extra,
      mix,
      shared_chart: sharedChartId,
      chart_instance: instanceId(sharedChartId, mix),
      gained: sql`${gained}`,
    })
    .execute();
};

const getPool = (tournamentId: number) =>
  db
    .selectFrom('tournament_charts as tc')
    .innerJoin('tournament_brackets as b', 'b.id', 'tc.bracket_id')
    .select(['b.code', 'tc.shared_chart_id', 'tc.ladder_level', 'tc.ladder_type'])
    .where('tc.tournament_id', '=', tournamentId)
    .execute();

const getAssignments = async (tournamentId: number) => {
  const rows = await db
    .selectFrom('tournament_player_brackets as tpb')
    .innerJoin('tournament_brackets as b', 'b.id', 'tpb.bracket_id')
    .select(['tpb.player_id', 'tpb.skill_level', 'b.code'])
    .where('tpb.tournament_id', '=', tournamentId)
    .execute();
  return Object.fromEntries(rows.map((r) => [r.player_id, { skill: r.skill_level, code: r.code }]));
};

describe('Tournaments', () => {
  describe('skill rule', () => {
    const examples: [number[], number | null][] = [
      [[19, 18, 17, 17], null],
      [[19, 18, 17, 17, 17], 17],
      [[19, 18, 17, 17, 16], 16],
      [[18, 18, 18, 18, 19], 18],
      [[20, 21, 20, 21, 20], 20],
      [[12, 14, 15, 16, 17], 12],
      [[14, 15, 16, 17, 18], 14],
    ];
    examples.forEach(([levels, skill]) => {
      it(`${levels.join(', ')} -> ${skill ?? 'unrated'}`, () => {
        assert.equal(skillLevel(levels), skill);
      });
    });

    it('maps skill levels to brackets', () => {
      const cases: [number | null, string][] = [
        [null, 'Easy'],
        [1, 'Easy'],
        [13, 'Easy'],
        [14, 'Mid'],
        [16, 'Mid'],
        [17, 'High'],
        [19, 'High'],
        [20, 'Top'],
        [23, 'Top'],
        [28, 'Top'],
      ];
      cases.forEach(([skill, code]) =>
        assert.equal(bracketForSkill(skill), code, `skill ${skill}`)
      );
    });
  });

  describe('ranking', () => {
    it('sums the best 3 of up to 6 charts and shares tied places', () => {
      const leaderboard = rankLeaderboard([
        {
          playerId: 1,
          nickname: 'a',
          bests: [900, 990, 950, 800, 970, 100].map((score, i) => ({ sharedChartId: i, score })),
        },
        {
          playerId: 2,
          nickname: 'b',
          bests: [1000, 950, 960].map((score, i) => ({ sharedChartId: i, score })),
        },
        { playerId: 3, nickname: 'c', bests: [{ sharedChartId: 0, score: 999 }] },
        { playerId: 4, nickname: 'd', bests: [{ sharedChartId: 0, score: 999 }] },
      ]);

      assert.deepEqual(
        leaderboard.map((e) => [e.playerId, e.rank, e.total]),
        [
          [2, 1, 2910],
          [1, 1, 2910],
          [3, 3, 999],
          [4, 3, 999],
        ]
      );
      assert.deepEqual(
        leaderboard[1].charts.filter((c) => c.counted).map((c) => c.score),
        [990, 970, 950]
      );
    });
  });

  describe('lifecycle', () => {
    beforeEach(seedPool);

    it('only draws S/D charts that exist in every supported mix', async () => {
      const ids = (await poolChartIds().execute()).map((r) => r.shared_chart).sort();
      assert.deepEqual(ids, poolCharts.map((c) => c.id).sort());
    });

    it('creates the month with its brackets and a ladder pool per bracket', async () => {
      const { id, created } = await createTournament({ year: 2026, month: 10 });
      assert.isTrue(created);

      const tournament = await db
        .selectFrom('tournaments')
        .select([
          'name',
          'state',
          sql<string>`date_format(start_date, '%Y-%m-%d %T')`.as('start'),
          sql<string>`date_format(end_date, '%Y-%m-%d %T')`.as('end'),
        ])
        .where('id', '=', id)
        .executeTakeFirstOrThrow();
      assert.deepEqual(tournament, {
        name: 'October 2026',
        state: 'Live',
        start: '2026-10-01 00:00:00',
        end: '2026-10-25 00:00:00',
      });

      const pool = await getPool(id);
      for (const bracket of TOURNAMENT_BRACKETS) {
        const charts = pool.filter((c) => c.code === bracket.code);
        const slots = (list: { level: number; type: string }[]) =>
          list.map((s) => `${s.type}${s.level}`).sort();
        assert.deepEqual(
          slots(charts.map((c) => ({ level: c.ladder_level, type: c.ladder_type }))),
          slots(bracket.ladder),
          bracket.code
        );
        assert.equal(new Set(charts.map((c) => c.shared_chart_id)).size, 6);
        for (const chart of charts) {
          const source = poolCharts.find((c) => c.id === chart.shared_chart_id)!;
          assert.equal(
            `${source.type}${source.level}`,
            `${chart.ladder_type}${chart.ladder_level}`
          );
        }
      }
    });

    it('is idempotent per month', async () => {
      const first = await createTournament({ year: 2026, month: 10 });
      const second = await createTournament({ year: 2026, month: 10 });

      assert.deepEqual(second, { id: first.id, created: false });
      assert.lengthOf(await getPool(first.id), 24);
    });

    it("avoids the last two months' charts while candidates remain", async () => {
      const oct = await getPool((await createTournament({ year: 2026, month: 10 })).id);
      const nov = await getPool((await createTournament({ year: 2026, month: 11 })).id);
      const dec = await getPool((await createTournament({ year: 2026, month: 12 })).id);

      const octIds = new Set(oct.map((c) => c.shared_chart_id));
      assert.isFalse(
        nov.some((c) => octIds.has(c.shared_chart_id)),
        'November repeats October'
      );
      // Easy needs 2 of the 4 S11 charts a month, so December has to reuse some
      assert.lengthOf(dec, 24);
    });

    it('assigns every visible player a bracket from their 950k+ depth', async () => {
      const t = '2026-09-10 12:00:00';
      // High: 5th-highest qualifying level is 17, scored on different mixes
      await addResult(1, chartAt(19, 'S'), 960000, t, { mix: 26 });
      await addResult(1, chartAt(18, 'D'), 955000, t, { mix: 28 });
      await addResult(1, chartAt(17, 'S'), 999000, t);
      await addResult(1, chartAt(17, 'D'), 950000, t);
      await addResult(1, chartAt(17, 'S', 1), 970000, t);
      // 5 results but only 4 charts, plus a near miss: unrated
      await addResult(2, chartAt(15, 'S'), 990000, t);
      await addResult(2, chartAt(15, 'S'), 995000, t, { mix: 28 });
      await addResult(2, chartAt(15, 'S', 1), 990000, t);
      await addResult(2, chartAt(15, 'S', 2), 990000, t);
      await addResult(2, chartAt(15, 'S', 3), 990000, t);
      await addResult(2, chartAt(16, 'S'), 949999, t);
      // the 5th chart has an approximate date: unrated
      for (const i of [0, 1, 2, 3]) {
        await addResult(3, chartAt(12, 'S', i), 980000, t);
      }
      await addResult(3, chartAt(12, 'D'), 980000, t, { exact_gain_date: 0 });
      // the 5th chart is older than 180 days and the 6th is after the start: unrated
      for (const i of [0, 1, 2, 3]) {
        await addResult(4, chartAt(20, 'S', i), 980000, t);
      }
      await addResult(4, chartAt(20, 'D'), 980000, '2026-04-03 23:59:59');
      await addResult(4, chartAt(20, 'D', 1), 980000, '2026-10-01 00:00:00');
      // hidden players get no bracket
      for (const i of [0, 1, 2, 3, 4]) {
        await addResult(5, chartAt(21, 'S', i % 4), 990000, t, { mix: 26 + (i % 3) });
      }
      // HJ and other play options don't matter; 20, 21, 20, 21, 20 -> Top
      await addResult(6, chartAt(20, 'S'), 980000, '2026-04-04 00:00:00', {
        mods_list: 'HJ AV500',
      });
      await addResult(6, chartAt(21, 'S'), 980000, t);
      await addResult(6, chartAt(20, 'D'), 980000, t);
      await addResult(6, chartAt(21, 'D'), 980000, t);
      await addResult(6, chartAt(20, 'S', 1), 980000, t, { mods_list: 'M' });
      // 14, 15, 16, 17, 18 -> Mid
      for (const level of [14, 15, 16, 17, 18]) {
        await addResult(7, chartAt(level, 'D'), 951000, t);
      }

      const { id } = await createTournament({ year: 2026, month: 10 });

      assert.deepEqual(await getAssignments(id), {
        1: { skill: 17, code: 'High' },
        2: { skill: null, code: 'Easy' },
        3: { skill: null, code: 'Easy' },
        4: { skill: null, code: 'Easy' },
        6: { skill: 20, code: 'Top' },
        7: { skill: 14, code: 'Mid' },
      });
    });

    it('scores the best 3 eligible pool scores inside the window', async () => {
      for (const i of [0, 1, 2, 3]) {
        await addResult(6, chartAt(21, 'S', i), 990000, '2026-09-10 12:00:00');
      }
      await addResult(6, chartAt(21, 'D'), 990000, '2026-09-10 12:00:00');
      const { id } = await createTournament({ year: 2026, month: 10 });
      const easy = (await getPool(id))
        .filter((c) => c.code === 'Easy')
        .map((c) => c.shared_chart_id);
      const t = '2026-10-10 12:00:00';

      // player 2: best 3 of 5 = 990k + 980k + 970k, on all three mixes
      await addResult(2, easy[0], 990000, t, { mix: 26, mods_list: 'HJ' });
      await addResult(2, easy[1], 980000, t, { mix: 28 });
      await addResult(2, easy[2], 970000, t);
      await addResult(2, easy[3], 960000, t);
      await addResult(2, easy[4], 950000, t);
      // not counted: approximate date, hidden result, outside the window
      await addResult(2, easy[0], 999000, t, { exact_gain_date: 0 });
      await addResult(2, easy[1], 999000, t, { is_hidden: 1 });
      await addResult(2, easy[2], 1000000, '2026-09-30 23:59:59');
      await addResult(2, easy[3], 1000000, '2026-10-25 00:00:00');
      // not counted: VJ has no Phoenix score
      await db
        .insertInto('results')
        .values({
          ...getResultDefaults({ playerId: 2, score: 1000000 }),
          mix: 27,
          shared_chart: easy[4],
          chart_instance: instanceId(easy[4], 27),
          gained: sql`${t}`,
          rank_mode: 1,
          score_phoenix: null,
        })
        .execute();
      // player 3 ties player 2 on the total, with a better single
      await addResult(3, easy[0], 1000000, t);
      await addResult(3, easy[1], 970000, t);
      await addResult(3, easy[2], 970000, t);
      // player 4: last second of the window counts
      await addResult(4, easy[5], 900000, t);
      await addResult(4, easy[4], 800000, '2026-10-24 23:59:59');
      // not in Easy
      await addResult(6, easy[0], 1000000, t);

      const tournament = await getTournament({ tournamentId: id, playerId: 2 });
      const bracket = tournament!.brackets.find((b) => b.code === 'Easy')!;

      assert.deepEqual(
        bracket.leaderboard.map((e) => [e.playerId, e.rank, e.total]),
        [
          [3, 1, 2940000],
          [2, 1, 2940000],
          [4, 3, 1700000],
        ]
      );
      assert.deepEqual(
        bracket.leaderboard[1].charts.map((c) => [c.sharedChartId, c.score, c.counted]),
        [
          [easy[0], 990000, true],
          [easy[1], 980000, true],
          [easy[2], 970000, true],
          [easy[3], 960000, false],
          [easy[4], 950000, false],
        ]
      );
      assert.deepEqual(tournament!.playerBracket, { bracketId: bracket.id, skillLevel: null });
      assert.equal(bracket.playerCount, 5);
      assert.lengthOf(bracket.charts, 6);
      assert.deepEqual(
        bracket.charts[0].instances.map((i) => i.mix),
        MIXES
      );
    });

    it('ends on the 25th', async () => {
      const { id } = await createTournament({ year: 2026, month: 10 });

      assert.equal(await endTournaments('2026-10-24 23:59:59'), 0);
      assert.equal(await endTournaments('2026-10-25 00:00:00'), 1);

      const { state } = await db
        .selectFrom('tournaments')
        .select('state')
        .where('id', '=', id)
        .executeTakeFirstOrThrow();
      assert.equal(state, 'Ended');
    });

    it('serves the latest tournament over tRPC', async () => {
      await createTournament({ year: 2026, month: 9 });
      await createTournament({ year: 2026, month: 10 });

      const res = await req()
        .get('/trpc/tournaments.get')
        .query({ input: JSON.stringify({ json: {} }) })
        .expect(200);

      assert.equal(res.body.result.data.json.name, 'October 2026');
      assert.lengthOf(res.body.result.data.json.brackets, 4);
    });
  });
});
