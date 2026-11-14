import { pingDb } from '@pumpking/database/health';
import createDebug from 'debug';
import express from 'express';

const debug = createDebug('bot:app');

export const app = express();

app.get('/healthz', async (_req, res) => {
  try {
    await pingDb();
    res.json({ status: 'ok' });
  } catch (error) {
    debug(error);
    res.status(503).json({ status: 'error' });
  }
});
