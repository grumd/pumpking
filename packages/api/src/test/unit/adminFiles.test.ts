import { db } from '@pumpking/database/db';
import { assert } from 'chai';
import fs from 'fs';
import path from 'path';
import { req } from 'test/helpers';
import { addResultsSession, adminSession } from 'test/helpers/sessions';
import { getResultDefaults } from 'test/seeds/initialSeed';

describe('Admin files', () => {
  const screen = fs.readFileSync(path.join(__dirname, '../files/test.jpg'));
  const scan = { left: { result: { score: 1000000 } } };
  const agentFolder = path.resolve(process.env.SCREENSHOT_AGENT_BASE_FOLDER ?? '', 'files-test');
  const webFolder = path.resolve(process.env.SCREENSHOT_BASE_FOLDER ?? '', 'files-test-web');

  // Uploads an agent's screen file and its scan JSON, as piu-spy does
  const writeUpload = (folder: string, name: string) => {
    fs.mkdirSync(path.join(folder, '2026-09-30'), { recursive: true });
    fs.writeFileSync(path.join(folder, '2026-09-30', `${name}.jpg`), screen);
    fs.writeFileSync(path.join(folder, '2026-09-30', `${name}.json`), JSON.stringify(scan));
  };

  const insertResult = async (agent: number, screenFile: string | null) => {
    const { insertId } = await db
      .insertInto('results')
      .values({ ...getResultDefaults({ playerId: 1 }), agent, screen_file: screenFile })
      .executeTakeFirstOrThrow();
    return Number(insertId);
  };

  const insertPurgatory = async (screenFile: string) => {
    const { insertId } = await db
      .insertInto('purgatory')
      .values({
        screen_file: screenFile,
        recognition_notes: '',
        reason: 'Unknown player',
        added: new Date(),
        agent: 2,
        track_name: '',
        mix_name: '',
        chart_label: '',
        player_name: '',
        gained: new Date(),
        exact_gain_date: 1,
      })
      .executeTakeFirstOrThrow();
    return Number(insertId);
  };

  beforeEach(() => {
    writeUpload(agentFolder, 'agent-screen');
    writeUpload(webFolder, 'web-screen');
  });

  afterEach(() => {
    fs.rmSync(agentFolder, { recursive: true, force: true });
    fs.rmSync(webFolder, { recursive: true, force: true });
  });

  it("sends a result's screen file as an attachment", async () => {
    const id = await insertResult(2, 'files-test/2026-09-30/agent-screen.jpg');

    const res = await req()
      .get(`/admin/files/results/${id}/screen`)
      .set('session', adminSession)
      .expect(200);

    assert.equal(res.headers['content-type'], 'image/jpeg');
    assert.equal(res.headers['content-disposition'], 'attachment; filename="agent-screen.jpg"');
    assert.isTrue(screen.equals(res.body), 'the file content is sent as is');
  });

  it("sends a result's scan JSON from next to its screen file", async () => {
    const id = await insertResult(2, 'files-test/2026-09-30/agent-screen.jpg');

    const res = await req()
      .get(`/admin/files/results/${id}/scan`)
      .set('session', adminSession)
      .expect(200);

    assert.equal(res.headers['content-disposition'], 'attachment; filename="agent-screen.json"');
    assert.deepEqual(res.body, scan);
  });

  it('finds the files of results added on the web in their own folder', async () => {
    const id = await insertResult(-1, 'files-test-web/2026-09-30/web-screen.jpg');

    const res = await req()
      .get(`/admin/files/results/${id}/screen`)
      .set('session', adminSession)
      .expect(200);

    assert.isTrue(screen.equals(res.body));
  });

  it("sends a purgatory row's screen file and scan JSON", async () => {
    const id = await insertPurgatory('files-test/2026-09-30/agent-screen.jpg');

    const screenRes = await req()
      .get(`/admin/files/purgatory/${id}/screen`)
      .set('session', adminSession)
      .expect(200);
    assert.isTrue(screen.equals(screenRes.body));

    const scanRes = await req()
      .get(`/admin/files/purgatory/${id}/scan`)
      .set('session', adminSession)
      .expect(200);
    assert.deepEqual(scanRes.body, scan);
  });

  it('is for admins only', async () => {
    const id = await insertResult(2, 'files-test/2026-09-30/agent-screen.jpg');

    await req().get(`/admin/files/results/${id}/screen`).expect(401);
    await req()
      .get(`/admin/files/results/${id}/screen`)
      .set('session', addResultsSession)
      .expect(401);
  });

  it('returns 404 for a missing row, screen file or file on disk', async () => {
    const noScreenFileId = await insertResult(2, null);
    const missingFileId = await insertResult(2, 'files-test/2026-09-30/missing.jpg');

    await req().get('/admin/files/results/999999/screen').set('session', adminSession).expect(404);
    await req()
      .get(`/admin/files/results/${noScreenFileId}/screen`)
      .set('session', adminSession)
      .expect(404);
    await req()
      .get(`/admin/files/results/${missingFileId}/screen`)
      .set('session', adminSession)
      .expect(404);
    await req()
      .get(`/admin/files/results/${missingFileId}/scan`)
      .set('session', adminSession)
      .expect(404);
  });

  it("doesn't send files outside the uploads folder", async () => {
    // A file that exists, one level above the uploads folder
    const outsidePath = path.resolve(process.env.SCREENSHOT_AGENT_BASE_FOLDER ?? '', '..');
    const outsideName = `files-test-outside-${Date.now()}.jpg`;
    fs.writeFileSync(path.join(outsidePath, outsideName), screen);

    try {
      const id = await insertResult(2, `../${outsideName}`);
      await req().get(`/admin/files/results/${id}/screen`).set('session', adminSession).expect(404);
    } finally {
      fs.rmSync(path.join(outsidePath, outsideName));
    }
  });

  it('rejects an unknown source or file kind', async () => {
    await req().get('/admin/files/players/1/screen').set('session', adminSession).expect(400);
    await req().get('/admin/files/results/1/video').set('session', adminSession).expect(400);
  });
});
