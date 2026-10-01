import { errorMessage } from '../agentApi';
import { app } from '../app';
import { post } from './helpers';
import { ARCADE, seed } from './seed';
import { db } from '@pumpking/database/db';
import { assert } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';

describe('Agents', () => {
  beforeEach(seed);

  it('answer the health check', async () => {
    const res = await request(app).get('/healthz').expect(200);
    assert.deepEqual(res.body, { status: 'ok' });
  });

  describe('heartbeat', () => {
    const sessions = () =>
      db
        .selectFrom('agent_sessions')
        .select(['agent_id', 'client_session_mark', 'status'])
        .orderBy('client_session_mark')
        .execute();

    it('keeps one session per run of the agent, with its latest status', async () => {
      const res = await post('/status', { status: { started: '2026-09-30 10:00:00', fps: 60 } });
      assert.deepEqual(res.body, {});
      await post('/status', { status: { started: '2026-09-30 10:00:00', fps: 30 } });

      assert.deepEqual(await sessions(), [
        { agent_id: 2, client_session_mark: '2026-09-30 10:00:00', status: { fps: 30 } },
      ]);
    });

    it('keeps a session without a status, as piu-spy never sends', async () => {
      assert.deepEqual((await post('/status', {})).body, {});
      assert.deepEqual(await sessions(), [
        { agent_id: 2, client_session_mark: 'undefined', status: {} },
      ]);
    });

    it("clears the agent's week-old sessions when a new one starts", async () => {
      await db
        .insertInto('agent_sessions')
        .values({
          agent_id: 2,
          client_session_mark: 'old',
          added_at: new Date('2026-01-01'),
          last_updated_at: new Date('2026-01-01'),
          status: '{}',
        })
        .execute();
      await post('/status', { status: { started: 'new' } });

      assert.deepEqual(
        (await sessions()).map((s) => s.client_session_mark),
        ['new']
      );
    });
  });

  describe('uploads', () => {
    let uploadsRoot: string;

    beforeEach(() => {
      uploadsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ingest-uploads-'));
      process.env.UPLOADS_ROOT = uploadsRoot;
    });

    afterEach(() => {
      fs.rmSync(uploadsRoot, { recursive: true });
      delete process.env.UPLOADS_ROOT;
    });

    // `filepath` sends the name with its folders, as piu-spy does (form-data cuts
    // `filename` to the base name)
    const upload = (filePath: string, contentType = 'application/json', content = '{}') => {
      const file = { filepath: filePath, filename: filePath, contentType };
      return request(app)
        .post('/upload')
        .set('agent-name', ARCADE.name)
        .set('agent-token', ARCADE.token)
        .attach('file', Buffer.from(content), file);
    };

    const info = (filePath: string) =>
      request(app)
        .get('/upload')
        .set('agent-name', ARCADE.name)
        .set('agent-token', ARCADE.token)
        .send({ path: filePath })
        .expect(200);

    it("stores a file in the agent's folder and tells whether it's there", async () => {
      const res = await upload('2026-09-30/scan.json').expect(200);
      assert.deepEqual(res.body, { updates: 'File uploaded to <2026-09-30/scan.json>' });
      assert.equal(
        fs.readFileSync(path.join(uploadsRoot, 'test-arcade/2026-09-30/scan.json'), 'utf8'),
        '{}'
      );

      const file = await info('2026-09-30/scan.json');
      assert.include(file.body.info, { path: '2026-09-30/scan.json', type: 'file', size: 2 });
      assert.isNumber(file.body.info.time);
      assert.deepEqual((await info('2026-09-30')).body, {
        info: { path: '2026-09-30', type: 'directory' },
      });
      assert.deepEqual((await info('2026-09-30/screen.mp4')).body, {
        info: { path: '2026-09-30/screen.mp4', type: null },
      });

      // From piu-spy on Windows
      const windows = await upload('2026-10-01\\scan.json').expect(200);
      assert.deepEqual(windows.body, { updates: 'File uploaded to <2026-10-01/scan.json>' });
      assert.isTrue(fs.existsSync(path.join(uploadsRoot, 'test-arcade/2026-10-01/scan.json')));
    });

    it('turns down paths outside the folder, other file types and large files', async () => {
      assert.deepEqual((await upload('a/../../escape.json').expect(200)).body, {
        error: 'Invalid path',
      });
      assert.deepEqual((await upload('notes.txt', 'text/plain').expect(500)).body, {
        error: "Inappropriate content type 'text/plain'",
      });
      await upload('big.mp4', 'video/mp4', 'x'.repeat(600 * 1024)).expect(413);
      assert.deepEqual(fs.readdirSync(uploadsRoot), []);
    });

    it("turns down requests that aren't a file upload", async () => {
      const notMultipart = await request(app)
        .post('/upload')
        .set('agent-name', ARCADE.name)
        .set('agent-token', ARCADE.token)
        .send({ file: '{}' })
        .expect(400);
      assert.deepEqual(notMultipart.body, { error: 'Unsupported content type: application/json' });

      const cutShort = await request(app)
        .post('/upload')
        .set('content-type', 'multipart/form-data; boundary=x')
        .send('--x\r\ncontent-disposition: form-data; name="file"; filename="a.json"\r\n')
        .expect(400);
      assert.deepEqual(cutShort.body, { error: 'Unexpected end of form' });

      const otherField = await request(app)
        .post('/upload')
        .attach('screen', Buffer.from('{}'), {
          filename: 'a.json',
          contentType: 'application/json',
        })
        .expect(500);
      assert.deepEqual(otherField.body, { error: "No 'file' provided in upload request" });
    });

    it('fails without UPLOADS_ROOT', async () => {
      delete process.env.UPLOADS_ROOT;
      const res = await upload('scan.json').expect(200);
      assert.deepEqual(res.body, {
        error: 'UPLOADS_ROOT is not set: add it to packages/ingest/.env',
      });
      process.env.UPLOADS_ROOT = uploadsRoot;
    });

    it('needs an agent', async () => {
      const res = await request(app)
        .post('/upload')
        .attach('file', Buffer.from('{}'), { filename: 'a.json', contentType: 'application/json' })
        .expect(200);
      assert.deepEqual(res.body, { error: 'permission denied' });
    });
  });

  it('answer errors that are not Error objects with their text', () => {
    assert.equal(errorMessage('permission denied'), 'permission denied');
  });
});
