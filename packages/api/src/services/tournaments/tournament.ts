import { eligibleResults } from './eligibility';
import { rankLeaderboard, type LeaderboardEntry, type Medal } from './rules';
import { SUPPORTED_MIXES } from 'constants/mixes';
import { db, type Transaction } from 'db';
import { sql } from 'kysely';
import _ from 'lodash/fp';

const tournamentWindow = {
  from: sql.ref<Date>('t.start_date'),
  to: sql.ref<Date>('t.end_date'),
};

export const getBracketLeaderboard = async (bracketId: number, trx?: Transaction) => {
  const rows = await eligibleResults(tournamentWindow, trx)
    .innerJoin('tournament_charts as tc', (join) =>
      join.onRef('tc.shared_chart_id', '=', 'r.shared_chart').on('tc.bracket_id', '=', bracketId)
    )
    .innerJoin('tournament_player_brackets as tpb', (join) =>
      join.onRef('tpb.player_id', '=', 'p.id').onRef('tpb.bracket_id', '=', 'tc.bracket_id')
    )
    .innerJoin('tournaments as t', 't.id', 'tc.tournament_id')
    .select([
      'p.id',
      'p.nickname',
      'p.region',
      'tc.shared_chart_id',
      sql<number>`max(r.score_phoenix)`.as('score'),
    ])
    .groupBy(['p.id', 'tc.shared_chart_id'])
    .execute();

  return rankLeaderboard(
    Object.values(_.groupBy('id', rows)).map((playerRows) => ({
      playerId: playerRows[0].id,
      nickname: playerRows[0].nickname,
      region: playerRows[0].region,
      bests: playerRows.map((row) => ({ sharedChartId: row.shared_chart_id, score: row.score })),
    }))
  );
};

const getFinalLeaderboard = async (
  bracketId: number
): Promise<(LeaderboardEntry & { medal: Medal | null })[]> => {
  const rows = await db
    .selectFrom('tournament_results as tr')
    .innerJoin('players as p', 'p.id', 'tr.player_id')
    .select(['p.id', 'p.nickname', 'p.region', 'tr.rank', 'tr.score', 'tr.medal', 'tr.charts'])
    .where('tr.bracket_id', '=', bracketId)
    .orderBy('tr.rank')
    .orderBy('tr.id')
    .execute();

  return rows.map((row) => ({
    playerId: row.id,
    nickname: row.nickname,
    region: row.region,
    rank: row.rank,
    total: row.score,
    medal: row.medal,
    charts: row.charts,
  }));
};

export const listTournaments = () =>
  db
    .selectFrom('tournaments')
    .select(['id', 'name', 'start_date as startDate', 'end_date as endDate', 'state'])
    .orderBy('start_date', 'desc')
    .execute();

export const getTournament = async ({
  tournamentId,
  playerId,
}: {
  tournamentId?: number;
  playerId?: number;
}) => {
  const tournament = await db
    .selectFrom('tournaments')
    .select(['id', 'name', 'start_date as startDate', 'end_date as endDate', 'state'])
    .$if(tournamentId !== undefined, (qb) => qb.where('id', '=', tournamentId!))
    .orderBy('start_date', 'desc')
    .limit(1)
    .executeTakeFirst();

  if (!tournament) {
    return null;
  }

  const [brackets, charts, playerCounts, playerBracket] = await Promise.all([
    db
      .selectFrom('tournament_brackets')
      .select(['id', 'code', 'name', 'min_id', 'max_id'])
      .where('tournament_id', '=', tournament.id)
      .orderBy('id')
      .execute(),
    db
      .selectFrom('tournament_charts as tc')
      .innerJoin('shared_charts as sc', 'sc.id', 'tc.shared_chart_id')
      .innerJoin('tracks as t', 't.id', 'sc.track')
      .select([
        'tc.bracket_id',
        'tc.shared_chart_id as sharedChartId',
        'tc.ladder_level as ladderLevel',
        'tc.ladder_type as ladderType',
        'sc.interpolated_difficulty as difficulty',
        't.full_name as trackName',
      ])
      .where('tc.tournament_id', '=', tournament.id)
      .orderBy('tc.ladder_level')
      .orderBy('tc.ladder_type')
      .orderBy('tc.id')
      .execute(),
    db
      .selectFrom('tournament_player_brackets')
      .select(['bracket_id', (eb) => eb.fn.countAll<number>().as('count')])
      .where('tournament_id', '=', tournament.id)
      .groupBy('bracket_id')
      .execute(),
    playerId
      ? db
          .selectFrom('tournament_player_brackets')
          .select(['bracket_id as bracketId', 'skill_level as skillLevel'])
          .where('tournament_id', '=', tournament.id)
          .where('player_id', '=', playerId)
          .executeTakeFirst()
      : undefined,
  ]);

  const instances = await db
    .selectFrom('chart_instances')
    .select(['shared_chart', 'mix', 'label', 'level'])
    .where(
      'shared_chart',
      'in',
      charts.map((chart) => chart.sharedChartId)
    )
    .where('mix', 'in', SUPPORTED_MIXES)
    .orderBy('mix')
    .execute();

  const leaderboards = await Promise.all(
    brackets.map(async (bracket) =>
      tournament.state === 'Ended'
        ? getFinalLeaderboard(bracket.id)
        : (await getBracketLeaderboard(bracket.id)).map((entry) => ({ ...entry, medal: null }))
    )
  );

  return {
    ...tournament,
    playerBracket: playerBracket ?? null,
    brackets: brackets.map((bracket, index) => ({
      id: bracket.id,
      code: bracket.code,
      name: bracket.name,
      minSkill: bracket.min_id === null ? null : Number(bracket.min_id),
      maxSkill: Number(bracket.max_id),
      playerCount: Number(playerCounts.find((row) => row.bracket_id === bracket.id)?.count ?? 0),
      charts: charts
        .filter((chart) => chart.bracket_id === bracket.id)
        .map(({ bracket_id, ...chart }) => ({
          ...chart,
          instances: instances
            .filter((instance) => instance.shared_chart === chart.sharedChartId)
            .map(({ mix, label, level }) => ({ mix, label, level })),
        })),
      leaderboard: leaderboards[index],
    })),
  };
};

export const getPlayerAwards = (playerId: number) =>
  db
    .selectFrom('tournament_results as tr')
    .innerJoin('tournaments as t', 't.id', 'tr.tournament_id')
    .innerJoin('tournament_brackets as b', 'b.id', 'tr.bracket_id')
    .select([
      't.id as tournamentId',
      't.start_date as startDate',
      'b.code as bracketCode',
      'tr.rank',
      'tr.score',
      'tr.medal',
    ])
    .where('tr.player_id', '=', playerId)
    .where('tr.medal', 'is not', null)
    .orderBy('t.start_date', 'desc')
    .execute();

// Pool charts of the Live tournament, and which of the given results count for it.
export const getLiveTournamentMarks = async (resultIds: number[]) => {
  const pool = await db
    .selectFrom('tournament_charts as tc')
    .innerJoin('tournaments as t', 't.id', 'tc.tournament_id')
    .select('tc.shared_chart_id')
    .where('t.state', '=', 'Live')
    .execute();

  const counting =
    pool.length && resultIds.length
      ? await eligibleResults(tournamentWindow)
          .innerJoin('tournament_charts as tc', 'tc.shared_chart_id', 'r.shared_chart')
          .innerJoin('tournament_player_brackets as tpb', (join) =>
            join.onRef('tpb.player_id', '=', 'p.id').onRef('tpb.bracket_id', '=', 'tc.bracket_id')
          )
          .innerJoin('tournaments as t', 't.id', 'tc.tournament_id')
          .select('r.id')
          .where('t.state', '=', 'Live')
          .where('r.id', 'in', resultIds)
          .execute()
      : [];

  return {
    poolChartIds: new Set(pool.map((row) => row.shared_chart_id)),
    countingResultIds: new Set(counting.map((row) => row.id)),
  };
};
