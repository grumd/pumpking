import { Router } from 'express';

import { searchChartsController } from 'controllers/charts/search';

const router = Router();

/**
 * GET /charts/search
 * @summary Search charts with filters
 * @tags charts
 * @return {array<object>} 200 - success response - application/json
 */
router.get('/search', searchChartsController);

export default router;
