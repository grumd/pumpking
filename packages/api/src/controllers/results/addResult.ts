import createDebug from 'debug';
import type { Response, Request, NextFunction } from 'express';
import { addResult } from 'services/results/addResult';
import { error } from 'utils';
import { z } from 'zod';

const debug = createDebug('backend-ts:controller:results');

const number = z
  .string()
  .regex(/^\d+$/)
  .transform((val) => Number(val));
const boolean = z.enum(['false', 'true']).transform((val) => val === 'true');
const date = z.string().transform((val) => new Date(val));

const MultipartResultData = z.object({
  playerId: number,
  grade: z.string(),
  mix: z.enum(['XX', 'Prime2', 'Prime']),
  mod: z.enum(['VJ', 'HJ', '']),
  score: number,
  perfect: number,
  great: number,
  good: number,
  bad: number,
  miss: number,
  combo: number,
  date: date,
  isExactDate: boolean,
  sharedChartId: number,
  pass: boolean,
});

export const addResultController = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    if (!request.user?.id) {
      return next(error(401, 'Unauthorized'));
    }
    if (!request.files || !request.files.screenshot) {
      return next(error(400, 'Bad Request: No screenshot uploaded'));
    }

    const zodResult = MultipartResultData.safeParse(request.body);
    if (zodResult.success === false) {
      return next(error(400, 'Bad Request: ' + zodResult.error.message));
    }

    const { data: result } = zodResult;

    await addResult(request.user?.id, {
      ...result,
      screenshotTempPath: request.files.screenshot.path,
    });

    response.json({ success: true });
  } catch (e) {
    debug(e);
    next(e);
  }
};
