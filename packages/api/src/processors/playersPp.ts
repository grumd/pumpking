import _ from 'lodash/fp';

import { db, type Transaction } from 'db';

type ScoreRecord = {
  id: number;
  song: string | null;
  label: string;
  diff: number | null;
  pp: number;
};

const getPlayerResults = async ({
  playerId,
  transaction,
}: {
  playerId: number;
  transaction?: Transaction;
}) => {
  const results = await (transaction ?? db)
    .selectFrom('results_highest_score_no_rank as best')
    .innerJoin('results', 'results.id', 'result_id')
    .innerJoin('chart_instances', 'chart_instances.id', 'results.chart_instance')
    .innerJoin('players', 'players.id', 'best.player_id')
    .innerJoin('tracks', 'tracks.id', 'chart_instances.track')
    .select([
      'results.id as result_id',
      'results.score_xx',
      'results.grade',
      'results.perfects',
      'results.greats',
      'results.goods',
      'results.bads',
      'results.misses',
      'results.pp',
      'results.player_name',
      'results.shared_chart as shared_chart_id',
      'best.player_id',
      'chart_instances.level',
      'chart_instances.label',
      'chart_instances.interpolated_difficulty',
      'tracks.short_name',
      'players.nickname',
    ])
    .where('best.player_id', '=', playerId)
    .where('chart_instances.label', 'not like', 'COOP%')
    .where('results.pp', 'is not', null)
    .orderBy('results.pp', 'desc')
    .limit(100)
    .execute();

  // Assert that PP is not null because we had a "where" clause
  return results as ((typeof results)[number] & { pp: number })[];
};

const getPlayerPpFromResults = (
  bestResults: {
    result_id: number;
    shared_chart_id: number;
    label: string;
    interpolated_difficulty: number | null;
    pp: number;
    player_name: string;
    short_name: string | null;
    nickname: string;
  }[]
) => {
  if (!bestResults || !bestResults.length) {
    return { nickname: '', pp: 0, bestScores: [] };
  }

  const player = {
    nickname: bestResults[0].nickname,
    pp: 0,
    bestScores: [] as ScoreRecord[],
  };

  bestResults.forEach((res, index) => {
    player.pp += 0.95 ** index * res.pp;
    if (index < 20) {
      player.bestScores.push({
        id: res.result_id,
        song: res.short_name,
        label: res.label,
        diff: res.interpolated_difficulty,
        pp: res.pp,
      });
    }
  });

  return player;
};

export const getSinglePlayerPpData = async (playerId: number, transaction?: Transaction) => {
  const results = await getPlayerResults({ playerId, transaction });
  const playerData = getPlayerPpFromResults(results);
  return playerData;
};

export const getSinglePlayerTotalPp = async (playerId: number, transaction?: Transaction) => {
  return (await getSinglePlayerPpData(playerId, transaction))?.pp;
};

export const getPlayersTotalPp = async () => {
  const playerIds = await db.selectFrom('players').select('id').where('hidden', '=', 0).execute();
  const players = await Promise.all(playerIds.map(({ id }) => getSinglePlayerPpData(id)));
  return players;
};
