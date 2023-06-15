import _ from 'lodash/fp';
import type { Response, Request, NextFunction } from 'express';

import { db } from 'db';

export const getPlayersAll = async (request: Request, response: Response, next: NextFunction) => {
  const players = await db
    .selectFrom('players')
    .select(['id', 'pp', 'nickname', 'arcade_name', 'region'])
    .execute();
  response.json(players);
};

export const getPlayersPp = async (request: Request, response: Response, next: NextFunction) => {
  const players = await db
    .selectFrom('players')
    .select(['id', 'pp', 'nickname', 'arcade_name', 'region'])
    .where('pp', 'is not', null)
    .orderBy('pp', 'desc')
    .execute();

  const resultsPerGrade = await db
    .selectFrom('results_best_grade')
    .leftJoin('results', 'results.id', 'result_id')
    .select(['player_id', 'results.grade', ({ fn }) => fn.count('result_id').as('results_count')])
    .groupBy('player_id')
    .groupBy('results.grade')
    .orderBy('player_id', 'asc')
    .orderBy('results.grade')
    .execute();

  const res = players.map((player) => {
    const grades = resultsPerGrade
      .filter((r) => r.player_id === player.id)
      .reduce((acc, r) => {
        return { ...acc, [r.grade ?? 'N/A']: r.results_count };
      }, {});
    return {
      ...player,
      grades,
    };
  });

  response.json(res);
};
