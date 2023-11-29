import { addResultController } from 'controllers/results/addResult';
import { resultAddedEffectController } from 'controllers/results/resultAddedEffect';
import { screenshotController } from 'controllers/results/screenshot';
import { Router } from 'express';
import { addResultsAuth } from 'middlewares/auth/auth';
import { validate } from 'utils';

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
  resultAddedEffectController
);

/**
 * POST /results/add-result
 * @summary Add a new result manually
 * @tags results add result
 * @return {string} 200 - success response
 */
router.post('/add-result', addResultsAuth, addResultController);

/**
 * GET /results/screenshot
 * @summary Get the result's screenshot
 * @tags results add result
 * @return {string} 200 - success response
 */
router.get(
  '/:resultId/screenshot',
  validate({ params: { resultId: 'required|integer' } }),
  screenshotController
);

export default router;
