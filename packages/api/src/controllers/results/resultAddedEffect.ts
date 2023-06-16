import type { Response, Request, NextFunction } from 'express';

import { resultAddedEffect } from 'services/results/resultAddedEffect';

export const resultAddedEffectController = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const resultId = Number(request.params.resultId);
    await resultAddedEffect(resultId);
    response.sendStatus(200);
  } catch (error) {
    next(error);
  }
};
