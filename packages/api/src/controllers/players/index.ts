import type { Response, Request, NextFunction } from 'express';
import _ from 'lodash/fp';
import { getPlayerGradeStats } from 'services/players/playerGrades';
import { getPlayers, getPlayersStats } from 'services/players/players';

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
    response.json(await getPlayersStats());
  } catch (error) {
    next(error);
  }
};

export const getPlayerGradesController = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    response.json(await getPlayerGradeStats(_.toNumber(request.params.playerId)));
  } catch (error) {
    next(error);
  }
};
