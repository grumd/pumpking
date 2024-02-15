import { db } from 'db';
import { sql } from 'kysely';

export const getPlayers = async ({ mixes }: { mixes?: number[] } = {}): Promise<
  {
    id: number;
    nickname: string;
    region: string | null;
    pp: number | null;
    arcade_name?: string;
  }[]
> => {
  if (mixes) {
    return await db
      .selectFrom('players')
      .innerJoin('arcade_player_names', (join) =>
        join
          .onRef('arcade_player_names.player_id', '=', 'players.id')
          .on('arcade_player_names.mix_id', 'in', mixes)
      )
      .select([
        'players.id',
        'players.pp',
        'players.nickname',
        'players.region',
        'arcade_player_names.name as arcade_name',
      ])
      .execute();
  } else {
    return await db.selectFrom('players').select(['id', 'pp', 'nickname', 'region']).execute();
  }
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
    .leftJoin(
      (eb) =>
        eb
          .selectFrom('arcade_player_names')
          .select(['player_id', 'name'])
          .distinct()
          .as('first_arcade_name'),
      (join) => join.onRef('first_arcade_name.player_id', '=', 'players.id')
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
    .select([
      'players.id',
      'players.pp',
      'players.nickname',
      'players.region',
      'first_arcade_name.name as arcade_name',
      'results_count',
      'best_results_count',
      'avg_score',
      'players.exp',
      'latest_result.gained as last_result_date',
    ])
    .where('players.pp', 'is not', null)
    .where('players.pp', '>', 0)
    .orderBy('players.pp', 'desc');

  const players = await query.execute();
  return players.map(
    ({
      avg_score,
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
    } => {
      return {
        ...player,
        exp: player.exp ? parseFloat(player.exp) : null,
        accuracy: avg_score ? avg_score / 10_000 : null,
      };
    }
  );
};
