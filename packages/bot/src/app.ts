import { pingDb } from '@pumpking/core/health';
import createDebug from 'debug';
import express from 'express';

const debug = createDebug('bot:app');

// Skeleton for now: only /healthz. The grammY runner and plugins come in W9 / W10
export const app = express();

// Liveness + DB check for deploys
app.get('/healthz', async (_req, res) => {
  try {
    await pingDb();
    res.json({ status: 'ok' });
  } catch (error) {
    debug(error);
    res.status(503).json({ status: 'error' });
  }
});
