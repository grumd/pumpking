import { TOURNAMENT_BRACKETS } from '@pumpking/core/constants/tournaments';
import { db } from '@pumpking/core/db';
import { assert } from 'chai';
import { sql } from 'kysely';
import { searchCharts } from 'services/charts/chartsSearch';
import { getPlayersStats } from 'services/players/players';
import { poolChartIds } from 'services/tournaments/eligibility';
import { createTournament, endTournaments } from 'services/tournaments/lifecycle';
import { bracketForSkill, rankLeaderboard, skillLevel } from 'services/tournaments/rules';
import { getPlayerAwards, getTournament } from 'services/tournaments/tournament';
import { req } from 'test/helpers';
import { addResultsSession } from 'test/helpers/sessions';
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
          region: null,
          bests: [900, 990, 950, 800, 970, 100].map((score, i) => ({ sharedChartId: i, score })),
        },
        {
          playerId: 2,
          nickname: 'b',
          region: null,
          bests: [1000, 950, 960].map((score, i) => ({ sharedChartId: i, score })),
        },
        { playerId: 3, nickname: 'c', region: null, bests: [{ sharedChartId: 0, score: 999 }] },
        { playerId: 4, nickname: 'd', region: null, bests: [{ sharedChartId: 0, score: 999 }] },
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
      // not counted: no Phoenix score
      await db
        .insertInto('results')
        .values({
          ...getResultDefaults({ playerId: 2, score: 1000000 }),
          mix: 27,
          shared_chart: easy[4],
          chart_instance: instanceId(easy[4], 27),
          gained: sql`${t}`,
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
      assert.equal(await endTournaments('2026-10-26 00:00:00'), 0);

      const { state } = await db
        .selectFrom('tournaments')
        .select('state')
        .where('id', '=', id)
        .executeTakeFirstOrThrow();
      assert.equal(state, 'Ended');
    });

    describe('when it ends', () => {
      let tournamentId: number;
      let easy: number[];

      beforeEach(async () => {
        tournamentId = (await createTournament({ year: 2026, month: 10 })).id;
        easy = (await getPool(tournamentId))
          .filter((c) => c.code === 'Easy')
          .map((c) => c.shared_chart_id);
        const t = '2026-10-10 12:00:00';
        // players 2 and 3 tie for 1st, 4 is 3rd, 7 is 4th
        await addResult(2, easy[0], 990000, t);
        await addResult(2, easy[1], 980000, t);
        await addResult(3, easy[2], 985000, t);
        await addResult(3, easy[3], 985000, t);
        await addResult(4, easy[4], 960000, t);
        await addResult(7, easy[5], 950000, t);
        await endTournaments('2026-10-25 00:00:00');
      });

      it('freezes the final results with medals, ties sharing the cup', async () => {
        const rows = await db
          .selectFrom('tournament_results')
          .select(['player_id', 'rank', 'score', 'medal', 'charts'])
          .where('tournament_id', '=', tournamentId)
          .orderBy('id')
          .execute();

        assert.deepEqual(
          rows.map((r) => [r.player_id, r.rank, r.score, r.medal]),
          [
            [2, 1, 1970000, 'gold'],
            [3, 1, 1970000, 'gold'],
            [4, 3, 960000, 'bronze'],
            [7, 4, 950000, null],
          ]
        );
        assert.deepEqual(rows[0].charts, [
          { sharedChartId: easy[0], score: 990000, counted: true },
          { sharedChartId: easy[1], score: 980000, counted: true },
        ]);
      });

      it('serves the ended leaderboard from the frozen results', async () => {
        await addResult(7, easy[0], 1000000, '2026-10-20 12:00:00');
        await db.deleteFrom('results').where('player_id', '=', 4).execute();

        const tournament = await getTournament({ tournamentId });
        const bracket = tournament!.brackets.find((b) => b.code === 'Easy')!;

        assert.deepEqual(
          bracket.leaderboard.map((e) => [e.playerId, e.rank, e.total, e.medal]),
          [
            [2, 1, 1970000, 'gold'],
            [3, 1, 1970000, 'gold'],
            [4, 3, 960000, 'bronze'],
            [7, 4, 950000, null],
          ]
        );
        assert.deepEqual(bracket.leaderboard[2].charts, [
          { sharedChartId: easy[4], score: 960000, counted: true },
        ]);
      });

      it('counts cups on the profile and in the ranking', async () => {
        const next = await createTournament({ year: 2026, month: 11 });
        const nextEasy = (await getPool(next.id)).find((c) => c.code === 'Easy')!;
        await addResult(3, nextEasy.shared_chart_id, 900000, '2026-11-10 12:00:00');
        await endTournaments('2026-11-25 00:00:00');

        const awards = await getPlayerAwards(3);
        assert.deepEqual(
          awards.map((a) => [a.tournamentId, a.bracketCode, a.rank, a.medal]),
          [
            [next.id, 'Easy', 1, 'gold'],
            [tournamentId, 'Easy', 1, 'gold'],
          ]
        );
        assert.lengthOf(await getPlayerAwards(7), 0);

        await db.updateTable('players').set({ pp: 100 }).execute();
        const stats = await getPlayersStats();
        const cups = (playerId: number) => stats.find((p) => p.id === playerId)!.cups;
        assert.deepEqual(cups(3), { gold: 2, silver: 0, bronze: 0 });
        assert.deepEqual(cups(4), { gold: 0, silver: 0, bronze: 1 });
        assert.deepEqual(cups(7), { gold: 0, silver: 0, bronze: 0 });
      });
    });

    it('marks pool charts and counting results on the main leaderboard while Live', async () => {
      const { id } = await createTournament({ year: 2026, month: 10 });
      const chart = (await getPool(id)).find((c) => c.code === 'Easy')!.shared_chart_id;
      const top = await db
        .selectFrom('tournament_brackets')
        .select('id')
        .where('tournament_id', '=', id)
        .where('code', '=', 'Top')
        .executeTakeFirstOrThrow();
      await db
        .updateTable('tournament_player_brackets')
        .set({ bracket_id: top.id })
        .where('player_id', '=', 6)
        .execute();
      await addResult(2, chart, 990000, '2026-10-10 12:00:00');
      // outside the window, and a player from another bracket
      await addResult(3, chart, 995000, '2026-09-30 12:00:00');
      await addResult(6, chart, 999000, '2026-10-10 12:00:00');

      const marks = async () => {
        const [item] = await searchCharts({ sharedChartId: chart });
        return {
          inTournament: item.inTournament,
          counting: item.results.filter((r) => r.countsForTournament).map((r) => r.playerId),
        };
      };

      assert.deepEqual(await marks(), { inTournament: true, counting: [2] });
      const [unrelated] = await searchCharts({ sharedChartId: 1 });
      assert.isFalse(unrelated.inTournament);

      await endTournaments('2026-10-25 00:00:00');
      assert.deepEqual(await marks(), { inTournament: false, counting: [] });
    });

    describe('notices', () => {
      const unread = () =>
        req()
          .get('/trpc/notices.unread')
          .set('session', addResultsSession)
          .expect(200)
          .then((res) => res.body.result.data.json);

      it('raises a tournament notice per assigned player until they visit', async () => {
        const { id } = await createTournament({ year: 2026, month: 10 });

        const rows = await db
          .selectFrom('player_notices')
          .select(['player_id', 'ref_id'])
          .where('scope', '=', 'tournament')
          .orderBy('player_id')
          .execute();
        assert.deepEqual(
          rows.map((r) => r.player_id),
          [1, 2, 3, 4, 6, 7]
        );
        assert.isTrue(rows.every((r) => r.ref_id === id));

        assert.deepEqual(await unread(), { tournament: true });
        const res = await req()
          .post('/trpc/notices.markRead')
          .set('session', addResultsSession)
          .send({ json: 'tournament' })
          .expect(200);
        assert.deepEqual(res.body.result.data.json, {});
        assert.deepEqual(await unread(), {});

        const next = await createTournament({ year: 2026, month: 11 });
        assert.deepEqual(await unread(), { tournament: true });
        const notices = await db.selectFrom('player_notices').selectAll().execute();
        assert.lengthOf(notices, 6);
        assert.isTrue(notices.every((n) => n.ref_id === next.id && n.read_at === null));
      });

      it('has nothing for guests', async () => {
        await createTournament({ year: 2026, month: 10 });
        const res = await req().get('/trpc/notices.unread').expect(200);
        assert.deepEqual(res.body.result.data.json, {});
      });
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
