import { Router } from 'express';
import type { Response, Request, NextFunction } from 'express';

import { addResult } from 'controllers/results/addResult';
import { getScreenshotPath } from 'controllers/results/getScreenshot';

import { resultAddedEffect } from 'processors/resultAddedEffect';

import { validate } from 'utils';

import { addResultsAuth } from 'middlewares/auth/auth';
import { getFirstFrameFromMp4 } from 'utils/mp4';

const router = Router();

/**
 * POST /results/result-added-effect/{resultId}
 * @summary Updates relevant information after a new result is added, e.g. pp, elo values.
 * @tags results
 * @param {string} resultId.path.required - Id of recently added result
 * @return {string} 200 - success response
 */
router.post(
  '/result-added-effect/:resultId',
  validate({ params: { resultId: 'required|integer' } }),
  async (request: Request, response: Response, next: NextFunction) => {
    const resultId = Number(request.params.resultId);
    await resultAddedEffect(resultId);
    response.sendStatus(200);
  }
);

/**
 * POST /results/add-result
 * @summary Add a new result manually
 * @tags results add result
 * @return {string} 200 - success response
 */
router.post('/add-result', addResultsAuth, addResult);

/**
 * GET /results/screenshot
 * @summary Get the result's screenshot
 * @tags results add result
 * @return {string} 200 - success response
 */
router.get(
  '/:resultId/screenshot',
  validate({ params: { resultId: 'required|integer' } }),
  async (request, response, next) => {
    try {
      const resultId = parseInt(request.params.resultId, 10);
      const filePath = await getScreenshotPath(resultId);
      if (filePath.endsWith('.mp4')) {
        getFirstFrameFromMp4(filePath, (buffer, err) => {
          if (err) {
            next(err);
          } else if (!buffer) {
            next(new Error('Extracting image from mp4 failed, empty buffer'));
          } else {
            response.writeHead(200, {
              'Content-Type': 'image/jpg',
              'Content-Length': buffer.length,
            });
            response.end(buffer);
          }
        });
      } else {
        response.sendFile(filePath);
      }
    } catch (e) {
      next(e);
    }
  }
);

export default router;
