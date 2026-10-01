import { db } from '@pumpking/database/db';
import { addEvent } from '@pumpking/database/events';
import type { Response, Request, NextFunction } from 'express';

// Called by the Python ingestion after it inserts or updates a result. The effects job
// applies the effect (services/results/resultAddedEffect.ts)
export const resultAddedEffectController = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const resultId = Number(request.params.resultId);
    await addEvent(db, 'resultAdded', { resultId });
    response.sendStatus(200);
  } catch (error) {
    next(error);
  }
};
