import { Router } from 'express';

import { getPlayersPp, getPlayersPpCalc } from 'controllers/players';

const router = Router();

/**
 * Player data with pp values
 * @typedef {object} PlayerPp
 * @property {string} id.required - Player's id
 * @property {string} nickname.required - Player's nickname
 * @property {string} pp.required - Player's pp
 */

/**
 * GET /players/pp
 * @summary Player list with pp values
 * @tags players
 * @return {array<PlayerPp>} 200 - success response - application/json
 */
router.get('/pp', getPlayersPp);

/**
 * GET /players/pp-calc
 * @summary Player list with pp values (calculated on the fly)
 * @tags players
 * @return {array<PlayerPp>} 200 - success response - application/json
 */
router.get('/pp-calc', getPlayersPpCalc);

export default router;
