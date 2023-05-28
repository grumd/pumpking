import { Router } from 'express';

import {
  recalculateAllResultsPp,
  refreshSharedChartInterpolatedDifficulty,
  getInterpolationInfoForSharedChart,
} from 'controllers/admin';

import { adminAuth } from 'middlewares/auth/auth';

const router = Router();

router.use(adminAuth);

/**
 * GET /admin/recalc/difficulty
 * @summary Recalculate all charts interpolated difficulty
 */
router.get('/recalc/difficulty', refreshSharedChartInterpolatedDifficulty);

/**
 * GET /admin/recalc/pp
 * @summary Recalculate all pp for all results and players
 */
router.get('/recalc/pp', recalculateAllResultsPp);

/**
 * GET /admin/info/chart-difficulty/:sharedChartId
 * @summary Get information on why a shared chart has a certain interpolated difficulty
 */
router.get('/info/chart-difficulty/:sharedChartId', getInterpolationInfoForSharedChart);

export default router;
