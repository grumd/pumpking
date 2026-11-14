import { db } from '@pumpking/database/db';
import { addEvent } from '@pumpking/database/events';
import type { Response, Request, NextFunction } from 'express';

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
