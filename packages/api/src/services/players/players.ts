import { db } from 'db';

export const getPlayers = async ({ mixId }: { mixId?: number } = {}): Promise<
  {
    id: number;
    nickname: string;
    region: string | null;
    pp: number | null;
    arcade_name?: string;
  }[]
> => {
  if (mixId) {
    return await db
      .selectFrom('players')
      .innerJoin('arcade_player_names', (join) =>
        join
          .onRef('arcade_player_names.player_id', '=', 'players.id')
          .on('arcade_player_names.mix_id', '=', mixId)
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

export const getPlayersGradeStats = async () => {
  const players = await db
    .selectFrom('players')
    .select(['id', 'pp', 'nickname', 'region'])
    .where('pp', 'is not', null)
    .orderBy('pp', 'desc')
    .execute();

  const resultsPerGrade = await db
    .selectFrom('results_best_grade as best')
    .leftJoin('results', 'results.id', 'result_id')
    .select([
      'best.player_id',
      'results.grade',
      ({ fn }) => fn.count<number>('result_id').as('results_count'),
    ])
    .groupBy('best.player_id')
    .groupBy('results.grade')
    .orderBy('best.player_id', 'asc')
    .orderBy('results.grade')
    .execute();

  return players.map((player) => {
    const grades = resultsPerGrade
      .filter((r) => r.player_id === player.id)
      .reduce((acc: Record<string, number>, r) => {
        return { ...acc, [r.grade ?? 'N/A']: r.results_count };
      }, {});
    return {
      ...player,
      grades,
    };
  });
};
