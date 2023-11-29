import type { Response, Request, NextFunction } from 'express';
import _ from 'lodash/fp';
import { calculateResultsPp } from 'services/results/resultsPp';

export const sharedChartPpController = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const resultPpMap = await calculateResultsPp({
      sharedChartId: Number(request.params.sharedChartId),
    });
    response.json(Object.fromEntries(resultPpMap.entries()));
  } catch (error) {
    next(error);
  }
};
