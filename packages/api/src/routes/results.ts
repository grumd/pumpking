import { Router } from 'express';

import { onResultAdded, getTopResults, getGroupedResults } from 'controllers/results';
import { addResult } from 'controllers/results/addResult';
import { getScreenshotPath } from 'controllers/results/getScreenshot';

import { validate } from 'utils';

import { addResultsAuth } from 'middlewares/auth/auth';

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
  onResultAdded
);

/**
 * GET /results/top
 * @summary Top results per chart
 * @tags results top pp
 * @return {string} 200 - success response
 */
router.get('/top', getTopResults);

/**
 * GET /results/grouped
 * @summary Top results per chart
 * @tags results top pp
 * @return {string} 200 - success response
 */
router.get('/grouped', getGroupedResults);

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
      response.sendFile(await getScreenshotPath(resultId));
    } catch (e) {
      next(e);
    }
  }
);

export default router;
