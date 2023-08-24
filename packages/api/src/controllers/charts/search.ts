import _ from 'lodash/fp';
import type { Response, Request, NextFunction } from 'express';

import { searchCharts } from 'services/charts/chartsSearch';

export const searchChartsController = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    response.json(
      await searchCharts({
        ...request.query,
        // TODO: This abomination is only for testing
        currentPlayerId: request.query.currentPlayerId
          ? Number(request.query.currentPlayerId)
          : undefined,
        mixes: request.query.mixes == null ? undefined : [request.query.mixes].flat().map(Number),
        sortChartsByPlayers:
          request.query.sortChartsByPlayers == null
            ? undefined
            : [request.query.sortChartsByPlayers].flat().map(Number),
        playersSome:
          request.query.playersSome == null
            ? undefined
            : [request.query.playersSome].flat().map(Number),
        playersAll:
          request.query.playersAll == null
            ? undefined
            : [request.query.playersAll].flat().map(Number),
        playersNone:
          request.query.playersNone == null
            ? undefined
            : [request.query.playersNone].flat().map(Number),
        limit: request.query.limit == null ? undefined : Number(request.query.limit),
        offset: request.query.offset == null ? undefined : Number(request.query.offset),
        maxLevel: request.query.maxLevel == null ? undefined : Number(request.query.maxLevel),
        minLevel: request.query.minLevel == null ? undefined : Number(request.query.minLevel),
      })
    );
  } catch (error) {
    next(error);
  }
};
