import { Router } from 'express';

import { refreshSharedChartResults, getSharedChartsInfo } from 'controllers/sharedCharts';
import { validate } from 'utils';

const router = Router();

/**
 * POST /shared-charts/{sharedChartId}/refresh
 * @summary Refreshes shared chart information - best scores, best grades, pp values
 * @tags shared chart refresh
 * @param {string} sharedChartId.path.required - Id of shared chart
 * @return {string} 200 - success response
 */
router.post(
  '/:sharedChartId/refresh',
  validate({ params: { sharedChartId: 'required|integer' } }),
  refreshSharedChartResults
);
router.get(
  '/:sharedChartId/refresh',
  validate({ params: { sharedChartId: 'required|integer' } }),
  refreshSharedChartResults
);

/**
 * GET /shared-charts/info
 * @summary Get info about all shared charts
 * @tags shared chart
 * @return {string} 200 - success response
 */
router.get('/info', getSharedChartsInfo);

export default router;
