import _ from 'lodash/fp';
import type { Response, Request, NextFunction } from 'express';

import { knex } from 'db';

import { error } from 'utils';
import { Player } from 'models/Player';
import { getPlayersTotalPp } from 'processors/playersPp';
import { ResultBestGrade } from 'models/ResultBestGrade';

const debug = require('debug')('backend-ts:controller:players');

export const getPlayersPp = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const players = await knex
      .query(Player)
      .select('id', 'pp', 'nickname', 'arcade_name', 'region')
      .whereNotNull('pp')
      .orderBy('pp', 'desc')
      .getMany();

    const resultsPerGrade = await knex
      .query(ResultBestGrade)
      .select('player_id', 'result.grade')
      .count('result_id', 'results_count')
      .innerJoinColumn('result')
      .groupBy('player_id')
      .groupBy('result.grade')
      .orderBy('player_id', 'asc')
      .orderBy('result.grade')
      .getMany();

    const res = players.map((player) => {
      const grades = resultsPerGrade
        .filter((r) => r.player_id === player.id)
        .reduce((acc, r) => {
          return { ...acc, [r.result.grade]: r.results_count };
        }, {});
      return {
        ...player,
        grades,
      };
    });

    response.json(res);
  } catch (e: any) {
    debug('ERROR:', e.message);
    next(error(500, 'Database Error: ' + e.message));
  }
};

export const getPlayersPpCalc = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const players = await getPlayersTotalPp();
    const playersSorted = players.sort((a, b) => b.pp - a.pp);
    response.json(playersSorted);
  } catch (e: any) {
    debug('ERROR:', e.message);
    next(error(500, 'Database Error: ' + e.message));
  }
};
