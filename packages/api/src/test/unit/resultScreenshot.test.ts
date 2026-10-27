import { db } from '@pumpking/database/db';
import { assert } from 'chai';
import { execFileSync } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import { getScreenshotFileName } from 'services/results/getScreenshot';
import { req } from 'test/helpers';
import { getResultDefaults } from 'test/seeds/initialSeed';

describe('Result screenshot', () => {
  const screen = fs.readFileSync(path.join(__dirname, '../files/test.jpg'));
  const folder = path.resolve(process.env.SCREENSHOT_AGENT_BASE_FOLDER ?? '', 'screenshot-test');

  const insertResult = async (screenFile: string, playerId = 1) => {
    const { insertId } = await db
      .insertInto('results')
      .values({ ...getResultDefaults({ playerId }), agent: 2, screen_file: screenFile })
      .executeTakeFirstOrThrow();
    return Number(insertId);
  };

  before(() => {
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'screen.jpg'), screen);
    // A one-frame video, as piu-spy records them
    execFileSync(ffmpegStatic as unknown as string, [
      '-loglevel',
      'error',
      '-f',
      'lavfi',
      '-i',
      'color=c=black:s=64x64:d=0.1',
      '-frames:v',
      '1',
      '-y',
      path.join(folder, 'screen.mp4'),
    ]);
  });

  after(() => {
    fs.rmSync(folder, { recursive: true, force: true });
  });

  it('sends the image inline with a file name of the player and chart', async () => {
    const id = await insertResult('screenshot-test/screen.jpg');

    const res = await req().get(`/results/${id}/screenshot`).expect(200);

    assert.equal(res.headers['content-type'], 'image/jpeg');
    assert.equal(
      res.headers['content-disposition'],
      'inline; filename="Dummy 1 - Track 1 S20.jpg"'
    );
    assert.isTrue(screen.equals(res.body), 'the file content is sent as is');
  });

  it('names the first frame of a video .jpg', async () => {
    const id = await insertResult('screenshot-test/screen.mp4', 2);

    const res = await req().get(`/results/${id}/screenshot`).expect(200);

    assert.equal(res.headers['content-type'], 'image/jpeg');
    assert.equal(
      res.headers['content-disposition'],
      'inline; filename="Dummy 2 - Track 1 S20.jpg"'
    );
  });

  it('returns 404 without a screenshot', async () => {
    await req().get('/results/999999/screenshot').expect(404);
  });

  it('makes a file name that file systems accept', () => {
    assert.equal(
      getScreenshotFileName(
        { playerName: 'a/b', trackName: 'What?  Is: "This"', chartLabel: 'D20' },
        '.jpg'
      ),
      'a b - What Is This D20.jpg'
    );
    assert.equal(
      getScreenshotFileName({ playerName: 'grumd', trackName: 'Etc...', chartLabel: null }, '.png'),
      'grumd - Etc.png'
    );
    assert.equal(getScreenshotFileName({}, '.jpg'), 'screenshot.jpg');
  });

  it('keeps non-ASCII names, with an ASCII fallback in the header', async () => {
    const { insertId } = await db
      .insertInto('players')
      .values({ nickname: '그럼드', hidden: 0 })
      .executeTakeFirstOrThrow();
    const id = await insertResult('screenshot-test/screen.jpg', Number(insertId));

    const res = await req().get(`/results/${id}/screenshot`).expect(200);

    assert.equal(
      res.headers['content-disposition'],
      `inline; filename="??? - Track 1 S20.jpg"; filename*=UTF-8''${encodeURIComponent(
        '그럼드'
      )}%20-%20Track%201%20S20.jpg`
    );
  });
});
