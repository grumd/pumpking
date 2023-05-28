import { Router } from 'express';

import AdminRouter from './admin';
import PlayersRouter from './players';
import ResultsRouter from './results';
import SharedChartsRouter from './sharedCharts';

const router = Router();

router.use('/admin', AdminRouter);
router.use('/players', PlayersRouter);
router.use('/results', ResultsRouter);
router.use('/shared-charts', SharedChartsRouter);

export default router;
