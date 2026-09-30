import { pingDb } from '@pumpking/core/health';
import createDebug from 'debug';
import express from 'express';

const debug = createDebug('bot:app');

// The HTTP side of the service is only /healthz; the Telegram bot starts in index.ts
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
