import AdminRouter from './admin';
import ChartsRouter from './charts';
import PlayersRouter from './players';
import ResultsRouter from './results';
import { Router } from 'express';

const router = Router();

router.use('/results', ResultsRouter);
router.use('/players', PlayersRouter);
router.use('/charts', ChartsRouter);
router.use('/admin', AdminRouter);

export default router;
