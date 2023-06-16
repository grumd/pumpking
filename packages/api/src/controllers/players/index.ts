import _ from 'lodash/fp';
import type { Response, Request, NextFunction } from 'express';

import { getPlayers, getPlayersGradeStats } from 'services/players/players';

export const getPlayersAllController = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    response.json(await getPlayers());
  } catch (error) {
    next(error);
  }
};

export const getPlayersStatsController = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    response.json(await getPlayersGradeStats());
  } catch (error) {
    next(error);
  }
};
