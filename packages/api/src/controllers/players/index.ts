import _ from 'lodash/fp';
import type { Response, Request, NextFunction } from 'express';

import { getPlayers, getPlayersGradeStats } from 'services/players/players';

export const getPlayersAllController = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  const players = getPlayers();
  response.json(players);
};

export const getPlayersPpController = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  response.json(await getPlayersGradeStats());
};
