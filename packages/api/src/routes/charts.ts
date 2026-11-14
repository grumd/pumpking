import {
  difficultyInterpolationController,
  updateChartsDifficultyController,
} from 'controllers/charts/difficultyInterpolation';
import { searchChartsController } from 'controllers/charts/search';
import { sharedChartPpController } from 'controllers/charts/sharedChartPp';
import { Router } from 'express';
import { validate } from 'utils';

const router = Router();

/**
 * GET /charts/interpolated-difficulty
 * @summary Search charts with filters
 * @tags charts
 * @return {array<object>} 200 - success response - application/json
 */
router.get('/interpolated-difficulty', difficultyInterpolationController);

/**
 * GET /charts/refresh-difficulty
 * @summary Update charts difficulty and update all scores
 * @tags charts
 * @return {array<object>} 200 - success response - application/json
 */
router.get('/refresh-difficulty', updateChartsDifficultyController);

/**
 * GET /charts/recalc-diff
 * @summary Recalculate difficulty
 * @tags charts
 * @return {array<object>} 200 - success response - application/json
 */
router.get('/search', searchChartsController);

/**
 * GET /charts/:sharedChartId/pp
 * @summary Recalculate pp for chart
 * @tags charts pp
 * @return {array<object>} 200 - success response - application/json
 */
router.get(
  '/:sharedChartId/pp',
  validate({ params: { sharedChartId: 'required|integer' } }),
  sharedChartPpController
);

export default router;
