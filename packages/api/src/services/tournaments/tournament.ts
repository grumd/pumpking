import { eligibleResults } from './eligibility';
import { rankLeaderboard } from './rules';
import { db, type Transaction } from '@pumpking/database/db';
import { SUPPORTED_MIXES } from '@pumpking/utils/mixes';
import { sql } from 'kysely';
import _ from 'lodash/fp';

const tournamentWindow = {
  from: sql.ref<Date>('t.start_date'),
  to: sql.ref<Date>('t.end_date'),
};

// Each bracket's ranking by the best eligible scores on its pool, for a Live tournament
// (and for the end job, which freezes it into tournament_results).
export const getLiveStandings = async (tournamentId: number, trx?: Transaction) => {
  const rows = await eligibleResults(tournamentWindow, trx)
    .innerJoin('tournament_player_brackets as tpb', 'tpb.player_id', 'p.id')
    .innerJoin('tournament_charts as tc', (join) =>
      join
        .onRef('tc.bracket_id', '=', 'tpb.bracket_id')
        .onRef('tc.shared_chart_id', '=', 'r.shared_chart')
    )
    .innerJoin('tournaments as t', 't.id', 'tpb.tournament_id')
    .select([
      'tpb.bracket_id',
      'p.id',
      'tc.shared_chart_id',
      sql<number>`max(r.score_phoenix)`.as('score'),
    ])
    .where('tpb.tournament_id', '=', tournamentId)
    .groupBy(['tpb.bracket_id', 'p.id', 'tc.shared_chart_id'])
    .execute();

  return Object.values(_.groupBy('bracket_id', rows)).flatMap((bracketRows) =>
    rankLeaderboard(
      Object.values(_.groupBy('id', bracketRows)).map((playerRows) => ({
        playerId: playerRows[0].id,
        bests: playerRows.map((row) => ({ sharedChartId: row.shared_chart_id, score: row.score })),
      }))
    ).map((entry) => ({ ...entry, bracketId: bracketRows[0].bracket_id }))
  );
};

const getFinalStandings = (tournamentId: number) =>
  db
    .selectFrom('tournament_results')
    .select([
      'bracket_id as bracketId',
      'player_id as playerId',
      'rank',
      'score as total',
      'medal',
      'charts',
    ])
    .where('tournament_id', '=', tournamentId)
    // written in leaderboard order by the end job
    .orderBy('id')
    .execute();

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

  const [brackets, charts, instances, players, standings] = await Promise.all([
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
      .selectFrom('chart_instances as ci')
      .innerJoin('tournament_charts as tc', 'tc.shared_chart_id', 'ci.shared_chart')
      .select(['ci.shared_chart', 'ci.mix', 'ci.label', 'ci.level'])
      .where('tc.tournament_id', '=', tournament.id)
      .where('ci.mix', 'in', SUPPORTED_MIXES)
      .orderBy('ci.mix')
      .execute(),
    db
      .selectFrom('tournament_player_brackets as tpb')
      .innerJoin('players as p', 'p.id', 'tpb.player_id')
      .select(['tpb.bracket_id', 'tpb.skill_level', 'p.id', 'p.nickname', 'p.region'])
      .where('tpb.tournament_id', '=', tournament.id)
      .where('p.hidden', '=', 0)
      .orderBy('p.nickname')
      .execute(),
    tournament.state === 'Ended'
      ? getFinalStandings(tournament.id)
      : getLiveStandings(tournament.id).then((rows) =>
          rows.map((row) => ({ ...row, medal: null }))
        ),
  ]);

  const playerById = new Map(players.map((player) => [player.id, player]));
  const scored = new Set(standings.map((entry) => entry.playerId));
  const me = playerId === undefined ? undefined : playerById.get(playerId);

  const toEntry = (player: (typeof players)[number], standing?: (typeof standings)[number]) => ({
    playerId: player.id,
    nickname: player.nickname,
    region: player.region,
    rank: standing?.rank ?? null,
    total: standing?.total ?? 0,
    medal: standing?.medal ?? null,
    charts: standing?.charts ?? [],
  });

  return {
    ...tournament,
    playerBracket: me ? { bracketId: me.bracket_id, skillLevel: me.skill_level } : null,
    brackets: brackets.map((bracket) => {
      const bracketPlayers = players.filter((player) => player.bracket_id === bracket.id);
      return {
        id: bracket.id,
        code: bracket.code,
        name: bracket.name,
        minSkill: bracket.min_id === null ? null : Number(bracket.min_id),
        maxSkill: Number(bracket.max_id),
        playerCount: bracketPlayers.length,
        charts: charts
          .filter((chart) => chart.bracket_id === bracket.id)
          .map(({ bracket_id, ...chart }) => ({
            ...chart,
            instances: instances
              .filter((instance) => instance.shared_chart === chart.sharedChartId)
              .map(({ mix, label, level }) => ({ mix, label, level })),
          })),
        // Ranked players first, then the bracket's players without a score, unranked.
        leaderboard: [
          ...standings
            .filter((entry) => entry.bracketId === bracket.id && playerById.has(entry.playerId))
            .map((entry) => toEntry(playerById.get(entry.playerId)!, entry)),
          ...bracketPlayers
            .filter((player) => !scored.has(player.id))
            .map((player) => toEntry(player)),
        ],
      };
    }),
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
