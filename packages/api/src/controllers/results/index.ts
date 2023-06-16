import _ from 'lodash/fp';
import type { Response, Request, NextFunction } from 'express';

import { error } from 'utils';

import { resultAddedEffect } from 'services/results/resultAddedEffect';

export const onResultAdded = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const resultId = _.toNumber(request.params.resultId);

    try {
      await resultAddedEffect(resultId);
      response.sendStatus(200);
    } catch (error: unknown) {
      next(error instanceof Error ? error : new Error('Unknown error'));
    }
  } catch (e: any) {
    next(error(500, 'Database Error: ' + e.message));
  }
};
