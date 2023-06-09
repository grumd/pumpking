import { Router } from 'express';

import { getPlayersStatsController, getPlayersAllController } from 'controllers/players';

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

export default router;
