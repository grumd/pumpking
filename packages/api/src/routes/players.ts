import {
  getPlayersStatsController,
  getPlayersAllController,
  getPlayerGradesController,
  getPlayerPpHistoryController,
  getPlayerAchievementsController,
  updateExpTotal,
} from 'controllers/players';
import { Router } from 'express';

const router = Router();

router.get('/stats', getPlayersStatsController);

router.get('/all', getPlayersAllController);

router.get('/:playerId/grades', getPlayerGradesController);

router.get('/:playerId/pp-history', getPlayerPpHistoryController);

router.get('/:playerId/achievements', getPlayerAchievementsController);

router.get('/update-exp', updateExpTotal);

export default router;
