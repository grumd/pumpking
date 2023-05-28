import _ from 'lodash/fp';

import { knex } from 'db';
import { Knex } from 'knex';
import { ResultHighestScoreNoRank } from 'models/ResultHighestScoreNoRank';
import { Player } from 'models/Player';

type ScoreRecord = {
  id: number;
  song: string;
  label: string;
  diff: number;
  pp: number;
};

type PlayersMap = Record<
  string,
  {
    nickname: string;
    pp: number;
    bestScores: ScoreRecord[];
  }
>;

const getPlayerResultsQuery = ({ playerId }: { playerId: number }) => {
  return knex
    .query(ResultHighestScoreNoRank)
    .innerJoinColumn('result')
    .innerJoinColumn('result.chart_instance')
    .innerJoinColumn('shared_chart')
    .innerJoinColumn('shared_chart.track')
    .innerJoinColumn('player')
    .select(
      'result_id',
      'result.score_xx',
      'result.grade',
      'result.perfects',
      'result.greats',
      'result.goods',
      'result.bads',
      'result.misses',
      'result.pp',
      'result.player_name',
      'shared_chart_id',
      'player_id',
      'result.chart_instance.level',
      'result.chart_instance.label',
      'result.chart_instance.interpolated_difficulty',
      'shared_chart.track.short_name',
      'player.nickname'
    )
    .where('player_id', playerId)
    .where('result.chart_label', 'NOT LIKE', 'COOP%')
    .whereNotNull('result.pp')
    .orderBy('result.pp', 'desc')
    .limit(100);
};

const getPlayerPpFromResults = (
  bestResults: {
    result_id: number;
    shared_chart_id: number;
    player_id: number;
    result: {
      chart_instance: {
        label: string;
        interpolated_difficulty: number;
      };
      pp: number;
      player_name: string;
    };
    shared_chart: {
      track: { short_name: string };
    };
    player: {
      nickname: string;
    };
  }[]
) => {
  if (!bestResults || !bestResults.length) {
    return { nickname: '', pp: 0, bestScores: [] };
  }

  const player = {
    nickname: bestResults[0].player.nickname,
    pp: 0,
    bestScores: [] as ScoreRecord[],
  };

  bestResults.forEach((res, index) => {
    player.pp += 0.95 ** index * res.result.pp;
    if (index < 20) {
      player.bestScores.push({
        id: res.result_id,
        song: res.shared_chart.track.short_name,
        label: res.result.chart_instance.label,
        diff: res.result.chart_instance.interpolated_difficulty,
        pp: res.result.pp,
      });
    }
  });

  return player;
};

export const getSinglePlayerPpData = async (
  playerId: number,
  transaction?: null | Knex.Transaction<any, any[]>
) => {
  let query = getPlayerResultsQuery({ playerId });
  if (transaction) {
    query = query.transacting(transaction);
  }
  const playerData = getPlayerPpFromResults(await query.getMany());
  return playerData;
};

export const getSinglePlayerTotalPp = async (
  playerId: number,
  transaction?: null | Knex.Transaction<any, any[]>
) => {
  return (await getSinglePlayerPpData(playerId, transaction))?.pp;
};

export const getPlayersTotalPp = async () => {
  const playerIds = await knex.query(Player).select('id').where('hidden', 0).getMany();
  const players = await Promise.all(playerIds.map(({ id }) => getSinglePlayerPpData(id)));
  return players;
};
