import { addResultController } from 'controllers/results/addResult';
import { resultAddedEffectController } from 'controllers/results/resultAddedEffect';
import { screenshotController } from 'controllers/results/screenshot';
import { Router } from 'express';
import { addResultsAuth } from 'middlewares/auth/auth';
import { validate } from 'utils';

const router = Router();

router.post(
  '/result-added-effect/:resultId',
  validate({ params: { resultId: 'required|integer' } }),
  resultAddedEffectController
);

router.post('/add-result', addResultsAuth, addResultController);

router.get(
  '/:resultId/screenshot',
  validate({ params: { resultId: 'required|integer' } }),
  screenshotController
);

export default router;
