import type { Response, Request, NextFunction } from 'express';
import _ from 'lodash/fp';
import { getPlayerAchievements } from 'services/players/playerAchievements';
import { getPlayerGradeStats } from 'services/players/playerGrades';
import { getPlayers, getPlayersStats } from 'services/players/players';
import { getPlayerPpHistory, updatePpHistoryIfNeeded } from 'services/players/playersPp';

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

export const getPlayerPpHistoryController = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    response.json(await getPlayerPpHistory(_.toNumber(request.params.playerId)));
  } catch (error) {
    next(error);
  }
};

export const getPlayerAchievementsController = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    response.json(await getPlayerAchievements(_.toNumber(request.params.playerId)));
  } catch (error) {
    next(error);
  }
};

export const updatePpHistory = async (request: Request, response: Response, next: NextFunction) => {
  try {
    await updatePpHistoryIfNeeded();
    response.json({ success: true });
  } catch (error) {
    next(error);
  }
};
