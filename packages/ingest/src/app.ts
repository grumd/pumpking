import { agentRoute, errorMessage } from './legacy';
import { submitResults, validateResults } from './results';
import { saveStatus } from './status';
import { getUploadInfo, MAX_UPLOAD_BYTES, uploadFile } from './uploads';
import { getAgentLastPlayers } from '@pumpking/core/agents/activity';
import { pingDb } from '@pumpking/core/health';
import createDebug from 'debug';
import express, { type ErrorRequestHandler } from 'express';

const debug = createDebug('ingest:app');

/**
 * Result ingestion for piu-spy, compatible with the legacy Python API it replaces: the
 * same paths, headers, multipart field and answers (see legacy.ts). Only the screen and
 * manual modes are served; the legacy stream and test modes aren't used any more.
 */
export const app = express();

app.use(express.json({ limit: MAX_UPLOAD_BYTES }));

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

app.post('/status', agentRoute(saveStatus));
app.post('/upload', uploadFile);
app.get('/upload', agentRoute(getUploadInfo));

app.post(
  '/results/screen/submit',
  agentRoute((call) => submitResults(call, 'screen'))
);
app.post(
  '/results/manual/submit',
  agentRoute((call) => submitResults(call, 'manual'))
);
app.post(
  '/results/screen/validate',
  agentRoute((call) => validateResults(call, 'screen'))
);
app.post(
  '/results/manual/validate',
  agentRoute((call) => validateResults(call, 'manual'))
);

// Public: who played on an agent in the last hours, and its uptime. owjibot posts it to
// its group chats
app.get('/agent/:id/lastPlayers', async (req, res) => {
  try {
    res.json(await getAgentLastPlayers(Number(req.params.id)));
  } catch (error) {
    debug(error);
    res.status(500).json({ error: errorMessage(error) });
  }
});

// A body that isn't JSON, or is too large
const bodyError: ErrorRequestHandler = (error, _req, res, _next) => {
  res.status(error.status ?? 500).json({ error: error.message });
};
app.use(bodyError);
