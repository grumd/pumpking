import { db } from 'db';
import { sql } from 'kysely';

export const getPlayers = async (): Promise<
  {
    id: number;
    nickname: string;
    region: string | null;
    pp: number | null;
    arcade_name: string | null;
  }[]
> => {
  // All players, each with their latest arcade name (newest mix) - one row per player.
  // The arcade_player_names table is per-mix by design, so no new columns per future mix.
  return await db
    .selectFrom('players')
    .leftJoin(
      (eb) =>
        eb
          .selectFrom('arcade_player_names as an')
          .select([
            'player_id',
            'name',
            sql<number>`row_number() over (partition by an.player_id order by an.mix_id desc)`.as(
              'rn'
            ),
          ])
          .as('latest_arcade_name'),
      (join) =>
        join
          .onRef('latest_arcade_name.player_id', '=', 'players.id')
          .on('latest_arcade_name.rn', '=', 1)
    )
    .select([
      'players.id',
      'players.pp',
      'players.nickname',
      'players.region',
      'latest_arcade_name.name as arcade_name',
    ])
    .execute();
};

export const getPlayersStats = async () => {
  const query = db
    .selectFrom('players')
    .leftJoin('results as latest_result', (join) =>
      join.on('latest_result.id', '=', (eb) =>
        eb
          .selectFrom('results')
          .select('id')
          .where('player_id', '=', sql.ref('players.id'))
          .orderBy('gained', 'desc')
          .limit(1)
      )
    )
    // latest arcade name (newest mix), one row per player - a plain DISTINCT join here
    // would emit players with names in several mixes once per name
    .leftJoin(
      (eb) =>
        eb
          .selectFrom('arcade_player_names as an')
          .select([
            'player_id',
            'name',
            sql<number>`row_number() over (partition by an.player_id order by an.mix_id desc)`.as(
              'rn'
            ),
          ])
          .as('latest_arcade_name'),
      (join) =>
        join
          .onRef('latest_arcade_name.player_id', '=', 'players.id')
          .on('latest_arcade_name.rn', '=', 1)
    )
    .leftJoin(
      (eb) =>
        eb
          .selectFrom('results')
          .select(['player_id', ({ fn }) => fn.avg<number>('score_phoenix').as('avg_score')])
          .groupBy('player_id')
          .where('score_phoenix', 'is not', null)
          .as('avg_score'),
      (join) => join.onRef('avg_score.player_id', '=', 'players.id')
    )
    .leftJoin(
      (eb) =>
        eb
          .selectFrom('results')
          .select(['player_id', ({ fn }) => fn.count<number>('id').as('results_count')])
          .groupBy('player_id')
          .as('results_count'),
      (join) => join.onRef('results_count.player_id', '=', 'players.id')
    )
    .leftJoin(
      (eb) =>
        eb
          .selectFrom((eb2) =>
            eb2
              .selectFrom('results as r2')
              .select([
                'player_id',
                'id',
                sql<number>`row_number() over (partition by r2.shared_chart, r2.player_id order by ${sql.ref(
                  'r2.score_phoenix'
                )} desc)`.as('score_rank'),
              ])
              .as('ranked_results')
          )
          .select(['player_id', ({ fn }) => fn.count<number>('id').as('best_results_count')])
          .where('score_rank', '=', 1)
          .groupBy('player_id')
          .as('best_results_count'),
      (join) => join.onRef('best_results_count.player_id', '=', 'players.id')
    )
    .leftJoin(
      (eb) =>
        eb
          .selectFrom('tournament_results')
          .select([
            'player_id',
            sql<number>`count(case when medal = 'gold' then 1 end)`.as('gold'),
            sql<number>`count(case when medal = 'silver' then 1 end)`.as('silver'),
            sql<number>`count(case when medal = 'bronze' then 1 end)`.as('bronze'),
          ])
          .groupBy('player_id')
          .as('cups'),
      (join) => join.onRef('cups.player_id', '=', 'players.id')
    )
    .select([
      'players.id',
      'players.pp',
      'players.nickname',
      'players.region',
      'latest_arcade_name.name as arcade_name',
      'results_count',
      'best_results_count',
      'avg_score',
      'players.exp',
      'latest_result.gained as last_result_date',
      'cups.gold',
      'cups.silver',
      'cups.bronze',
    ])
    .where('players.pp', 'is not', null)
    .where('players.pp', '>', 0)
    .orderBy('players.pp', 'desc');

  const players = await query.execute();
  return players.map(
    ({
      avg_score,
      gold,
      silver,
      bronze,
      ...player
    }): {
      id: number;
      nickname: string;
      exp: number | null;
      region: string | null;
      pp: number | null;
      arcade_name: string | null;
      accuracy: number | null;
      results_count: number | null;
      best_results_count: number | null;
      last_result_date: Date | null;
      cups: { gold: number; silver: number; bronze: number };
    } => {
      return {
        ...player,
        cups: { gold: gold ?? 0, silver: silver ?? 0, bronze: bronze ?? 0 },
        exp: player.exp ? parseFloat(player.exp) : null,
        accuracy: avg_score ? avg_score / 10_000 : null,
      };
    }
  );
};
