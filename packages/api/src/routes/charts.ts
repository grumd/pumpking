import {
  difficultyInterpolationController,
  updateChartsDifficultyController,
} from 'controllers/charts/difficultyInterpolation';
import { searchChartsController } from 'controllers/charts/search';
import { sharedChartPpController } from 'controllers/charts/sharedChartPp';
import { Router } from 'express';
import { validate } from 'utils';

const router = Router();

router.get('/interpolated-difficulty', difficultyInterpolationController);

router.get('/refresh-difficulty', updateChartsDifficultyController);

router.get('/search', searchChartsController);

router.get(
  '/:sharedChartId/pp',
  validate({ params: { sharedChartId: 'required|integer' } }),
  sharedChartPpController
);

export default router;
