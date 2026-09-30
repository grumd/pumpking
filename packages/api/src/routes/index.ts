import { Router } from 'express';

import ResultsRouter from './results';
import PlayersRouter from './players';
import ChartsRouter from './charts';
import AdminRouter from './admin';

const router = Router();

router.use('/results', ResultsRouter);
router.use('/players', PlayersRouter);
router.use('/charts', ChartsRouter);
router.use('/admin', AdminRouter);

export default router;
