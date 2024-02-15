import {
  getPlayersStatsController,
  getPlayersAllController,
  getPlayerGradesController,
  getPlayerPpHistoryController,
  updatePpHistory,
  getPlayerAchievementsController,
  updateExpTotal,
} from 'controllers/players';
import { Router } from 'express';

const router = Router();

/**
 * Player data with pp values
 * @typedef {object} PlayerPp
 * @property {string} id.required - Player's id
 * @property {string} nickname.required - Player's nickname
 * @property {string} pp.required - Player's pp
 */

/**
 * GET /players/stats
 * @summary Player list with stats
 * @tags players
 * @return {array<PlayerPp>} 200 - success response - application/json
 */
router.get('/stats', getPlayersStatsController);

/**
 * Player data
 * @typedef {object} Player
 * @property {string} id.required - Player's id
 * @property {string} nickname.required - Player's nickname
 */

/**
 * GET /players/all
 * @summary Player list
 * @tags players
 * @return {array<Player>} 200 - success response - application/json
 */
router.get('/all', getPlayersAllController);

router.get('/:playerId/grades', getPlayerGradesController);

router.get('/:playerId/pp-history', getPlayerPpHistoryController);

router.get('/:playerId/achievements', getPlayerAchievementsController);

router.get('/update-pp', updatePpHistory);

router.get('/update-exp', updateExpTotal);

export default router;
