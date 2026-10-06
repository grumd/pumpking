import { agentRoute, errorMessage } from './agentApi';
import { recheckPurgatory } from './ingestion/purgatory';
import { submitResults, validateResults } from './results';
import { saveStatus } from './status';
import { getUploadInfo, MAX_UPLOAD_BYTES, uploadFile } from './uploads';
import { pingDb } from '@pumpking/database/health';
import createDebug from 'debug';
import express, { type ErrorRequestHandler } from 'express';

const debug = createDebug('ingest:app');

/**
 * Result ingestion for piu-spy, compatible with the legacy Python API it replaces: the
 * same paths, headers, multipart field and answers (see agentApi.ts). Only the screen and
 * manual modes are served; the legacy stream and test modes aren't used any more.
 */
export const app = express();

app.use(express.json({ limit: MAX_UPLOAD_BYTES }));

// Liveness + DB check for deploys
app.get('/healthz', async (_req, res) => {
  try {
    await pingDb();
    res.json({ status: 'ok' });
    /* c8 ignore next 4: the tests can't take the database down under the app */
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

// For the API's admin purgatory recheck (body `{ id?, skipScoreCheck? }`): rechecks one row
// or all of them, optionally without checking the score against the stats.
// Internal: nginx forwards only piu-spy's paths here
app.post('/internal/purgatory/recheck', async (req, res) => {
  try {
    const id = req.body?.id;
    res.json(
      await recheckPurgatory(id == null ? undefined : Number(id), {
        skipScoreCheck: req.body?.skipScoreCheck === true,
      })
    );
  } catch (error) {
    debug(error);
    res.status(500).json({ error: errorMessage(error) });
  }
});

// express.json's errors: a body that isn't JSON (400) or is too large (413). The routes
// answer their own errors
const bodyError: ErrorRequestHandler = (error, _req, res, _next) => {
  res.status(error.status).json({ error: error.message });
};
app.use(bodyError);
