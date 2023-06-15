import { Router } from 'express';

import ResultsRouter from './results';
import PlayersRouter from './players';

const router = Router();

router.use('/results', ResultsRouter);
router.use('/players', PlayersRouter);

export default router;
