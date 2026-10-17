import { db } from '@pumpking/database/db';
import { MIXES } from '@pumpking/utils/mixes';
import { getPhoenixScore } from '@pumpking/utils/phoenixScore';
import { assert } from 'chai';
import fs from 'fs';
import { sql } from 'kysely';
import path from 'path';
import {
  checkRead,
  decide,
  exactStepCount,
  NUMBER_FIELDS,
  type ChartCandidate,
} from 'services/results/photos/decide';
import { READER_A, READER_B, type PhotoRead, type ReadPhoto } from 'services/results/photos/reader';
import { recognizePhoto, type PhotoInput } from 'services/results/photos/recognize';
import { applyEffects } from 'test/helpers';
import { addResultsSession } from 'test/helpers/sessions';
import { errorMessage, output, trpcMutation, trpcQuery } from 'test/helpers/trpc';
import { getResultDefaults } from 'test/seeds/initialSeed';

// 83 perfects and 17 greats on 100 steps: 932,340, AA+ on Phoenix but AA on Phoenix 2
const phoenixStats = { perfect: 83, great: 17, good: 0, bad: 0, miss: 0, max_combo: 100 };
const phoenixScore = getPhoenixScore({ ...phoenixStats, combo: phoenixStats.max_combo });

const phoenixRead = (read: Partial<PhotoRead> = {}): PhotoRead => ({
  song_title: 'TRACK 1',
  chart_type: 'S',
  level: 20,
  ...phoenixStats,
  score: phoenixScore,
  grade: 'AA',
  grade_broken: false,
  mod_badges: ['AV 620'],
  plate_text: 'ULTIMATE GAME',
  ...read,
});

const xxRead = (read: Partial<PhotoRead> = {}): PhotoRead => ({
  song_title: 'Track 1',
  chart_type: 'S',
  level: 20,
  perfect: 95,
  great: 5,
  good: 0,
  bad: 0,
  miss: 0,
  max_combo: 100,
  score: 120_000,
  grade: 'S',
  grade_broken: false,
  mod_badges: [],
  ...read,
});

const chart = (candidate: Partial<ChartCandidate> = {}): ChartCandidate => ({
  sharedChartId: 3,
  chartInstanceId: 3,
  songName: 'Track 1',
  label: 'S20',
  level: 20,
  duration: 'Standard',
  minTotalSteps: 100,
  maxTotalSteps: 100,
  ...candidate,
});

describe('Results from photos', () => {
  describe('checks of a read', () => {
    it('a Phoenix 2 read that adds up passes', () => {
      const check = checkRead(phoenixRead(), [chart()], MIXES.Phoenix2);
      assert.deepEqual(check.problems, []);
      assert.equal(check.chart?.sharedChartId, 3);
      assert.deepInclude(check.values, { score: phoenixScore, grade: 'AA', pass: true, mod: '' });
    });

    it('the grade between the two mixes thresholds follows the selected mix', () => {
      assert.deepEqual(checkRead(phoenixRead(), [chart()], MIXES.Phoenix2).problems, []);
      assert.deepEqual(checkRead(phoenixRead(), [chart()], MIXES.Phoenix).problems, ['grade']);
      assert.deepEqual(
        checkRead(phoenixRead({ grade: 'AA+' }), [chart()], MIXES.Phoenix).problems,
        []
      );
      assert.deepEqual(
        checkRead(phoenixRead({ grade: 'AA+' }), [chart()], MIXES.Phoenix2).problems,
        ['grade']
      );
    });

    it('a misread counter fails the score check', () => {
      const check = checkRead(phoenixRead({ great: 11, good: 6 }), [chart()], MIXES.Phoenix2);
      assert.deepEqual(check.problems, [...NUMBER_FIELDS]);
    });

    it('the plate must fit the misses and the pass', () => {
      const wrongPlate = checkRead(
        phoenixRead({ plate_text: 'MARVELOUS GAME' }),
        [chart()],
        MIXES.Phoenix2
      );
      assert.deepEqual(wrongPlate.problems, ['pass']);
      const unknownPlate = checkRead(
        phoenixRead({ plate_text: 'GREAT GAME' }),
        [chart()],
        MIXES.Phoenix2
      );
      assert.deepEqual(unknownPlate.problems, ['pass']);

      const fail = checkRead(phoenixRead({ plate_text: null }), [chart()], MIXES.Phoenix2);
      assert.deepEqual(fail.problems, []);
      assert.isFalse(fail.values.pass);
    });

    it('max combo over perfect + great fails', () => {
      const check = checkRead(xxRead({ max_combo: 101 }), [chart({ level: 20 })], MIXES.XX);
      assert.includeMembers(check.problems, [...NUMBER_FIELDS]);
    });

    it('XX: the score is a multiple of 100 over the lowest possible', () => {
      assert.deepEqual(checkRead(xxRead(), [chart()], MIXES.XX).problems, []);
      assert.deepEqual(checkRead(xxRead({ score: 120_050 }), [chart()], MIXES.XX).problems, [
        'score',
      ]);
      assert.deepEqual(checkRead(xxRead({ score: 90_000 }), [chart()], MIXES.XX).problems, [
        ...NUMBER_FIELDS,
      ]);
      assert.deepEqual(checkRead(xxRead({ grade: 'Q' }), [chart()], MIXES.XX).problems, ['grade']);
    });

    it('XX: a broken grade is a failed stage', () => {
      const check = checkRead(xxRead({ grade: 'A', grade_broken: true }), [chart()], MIXES.XX);
      assert.isFalse(check.values.pass);
      assert.deepEqual(check.problems, []);
    });

    it('mods from the side badges; rank mode only where the chart allows it', () => {
      assert.equal(checkRead(xxRead({ mod_badges: ['HJ'] }), [chart()], MIXES.XX).values.mod, 'HJ');
      const rank = checkRead(xxRead({ mod_badges: ['VJ'] }), [chart()], MIXES.XX);
      assert.equal(rank.values.mod, 'VJ');
      assert.deepEqual(rank.problems, []);
      assert.deepEqual(
        checkRead(xxRead({ mod_badges: ['VJ', 'HJ'] }), [chart()], MIXES.XX).problems,
        ['mod']
      );
      const shortCut = chart({ duration: 'Short' });
      assert.deepEqual(checkRead(xxRead({ mod_badges: ['VJ'] }), [shortCut], MIXES.XX).problems, [
        'mod',
      ]);
      assert.equal(
        checkRead(phoenixRead({ mod_badges: ['RANK'] }), [chart()], MIXES.Phoenix2).values.mod,
        'VJ'
      );
    });
  });

  describe('chart matching', () => {
    it('the exact step count must equal the judgements', () => {
      const check = checkRead(
        phoenixRead(),
        [chart({ minTotalSteps: 101, maxTotalSteps: 101 })],
        MIXES.Phoenix2
      );
      assert.isNull(check.chart);
      // A known count that differs points to a misread judgement
      assert.deepEqual(check.problems, ['chart', 'perfect', 'great', 'good', 'bad', 'miss']);
    });

    it('a step range is no match', () => {
      const range = chart({ minTotalSteps: 90, maxTotalSteps: 110 });
      assert.isNull(exactStepCount(range));
      const check = checkRead(phoenixRead(), [range], MIXES.Phoenix2);
      assert.isNull(check.chart);
      assert.equal(check.chartGuess, range);
      assert.deepEqual(check.problems, ['chart']);
    });

    it('a Phoenix 2 chart without a step count uses the Phoenix one', () => {
      const fallback = chart({
        minTotalSteps: null,
        maxTotalSteps: null,
        phoenixMinTotalSteps: 100,
        phoenixMaxTotalSteps: 100,
      });
      assert.equal(exactStepCount(fallback), 100);
      assert.equal(checkRead(phoenixRead(), [fallback], MIXES.Phoenix2).chart, fallback);
      // Only when its own count is unknown
      assert.isNull(exactStepCount({ ...fallback, minTotalSteps: 90, maxTotalSteps: 110 }));
    });

    it('two charts that fit are no match', () => {
      const check = checkRead(
        phoenixRead(),
        [chart(), chart({ sharedChartId: 4, chartInstanceId: 4 })],
        MIXES.Phoenix2
      );
      assert.isNull(check.chart);
      assert.isNull(check.chartGuess);
      assert.deepEqual(check.problems, ['chart']);
    });

    it('no chart for the title is no match', () => {
      const check = checkRead(phoenixRead(), [], MIXES.Phoenix2);
      assert.isNull(check.chart);
      assert.deepEqual(check.problems, ['chart']);
    });
  });

  describe('the decision', () => {
    const good = () => checkRead(phoenixRead(), [chart()], MIXES.Phoenix2);
    const misread = (read: Partial<PhotoRead>) =>
      checkRead(phoenixRead(read), [chart()], MIXES.Phoenix2);

    it('Phoenix: a first read that passes is saved', () => {
      const decision = decide(MIXES.Phoenix2, [good()]);
      assert.equal(decision.status, 'confident');
    });

    it('Phoenix: a failed first read and a second one that passes is saved', () => {
      const decision = decide(MIXES.Phoenix2, [misread({ max_combo: 10 }), good()]);
      assert.equal(decision.status, 'confident');
      assert.equal(decision.status === 'confident' && decision.values.combo, 100);
    });

    it('Phoenix: both fail, the fields where they differ are asked', () => {
      const decision = decide(MIXES.Phoenix2, [
        misread({ max_combo: 10 }),
        misread({ max_combo: 70 }),
      ]);
      assert.equal(decision.status, 'needsInput');
      assert.deepEqual(decision.status === 'needsInput' && decision.fields, ['combo']);
      assert.deepEqual(
        decision.status === 'needsInput' && decision.readValues.map((values) => values.combo),
        [10, 70]
      );
      assert.equal(decision.status === 'needsInput' && decision.chart?.sharedChartId, 3);
    });

    it('Phoenix: both agree and fail, all seven numbers are asked', () => {
      const decision = decide(MIXES.Phoenix2, [
        misread({ max_combo: 10 }),
        misread({ max_combo: 10 }),
      ]);
      assert.deepEqual(decision.status === 'needsInput' && decision.fields, [...NUMBER_FIELDS]);
    });

    it('Phoenix: the chart is asked when no read matched one', () => {
      const unknown = checkRead(
        phoenixRead({ song_title: 'GLORY OF REVENGE' }),
        [],
        MIXES.Phoenix2
      );
      const decision = decide(MIXES.Phoenix2, [unknown, unknown]);
      assert.deepEqual(decision.status === 'needsInput' && decision.fields, ['chart']);
    });

    it('nothing read asks for everything', () => {
      const decision = decide(MIXES.Phoenix2, [null, null]);
      assert.equal(decision.status === 'needsInput' && decision.fields.length, 11);
    });

    const xx = (read: Partial<PhotoRead> = {}) =>
      checkRead(xxRead(read), [chart({ sharedChartId: 1, chartInstanceId: 1 })], MIXES.XX);

    it('XX: both reads pass and agree, saved', () => {
      assert.equal(decide(MIXES.XX, [xx(), xx()]).status, 'confident');
    });

    it('XX: a single read is never enough', () => {
      assert.equal(decide(MIXES.XX, [xx(), null]).status, 'needsInput');
    });

    it('XX: reads that disagree on max combo, grade or mod are asked about', () => {
      const combo = decide(MIXES.XX, [xx(), xx({ max_combo: 99 })]);
      assert.deepEqual(combo.status === 'needsInput' && combo.fields, ['combo']);
      const grade = decide(MIXES.XX, [xx(), xx({ grade: 'SS' })]);
      assert.deepEqual(grade.status === 'needsInput' && grade.fields, ['grade']);
      const mod = decide(MIXES.XX, [xx(), xx({ mod_badges: ['HJ'] })]);
      assert.deepEqual(mod.status === 'needsInput' && mod.fields, ['mod']);
    });
  });

  describe('recognizePhoto', () => {
    const image = { mimeType: 'image/jpeg', data: Buffer.from('photo') };
    const screenshotPath = path.join(__dirname, '../files/test.jpg');
    const hash = 'a'.repeat(64);
    const input = (overrides: Partial<PhotoInput> = {}): PhotoInput => ({
      playerId: 7,
      isAdmin: false,
      autoSave: true,
      mix: 'Phoenix2',
      image,
      screenshotPath,
      hash,
      date: new Date('2026-10-01T12:00:00Z'),
      isExactDate: true,
      ...overrides,
    });

    // A reader stub that answers per model, and counts the calls
    const stubReader = (reads: Record<string, PhotoRead | null>) => {
      const calls: string[] = [];
      const readPhoto: ReadPhoto = async (reader) => {
        calls.push(reader.model);
        return { read: reads[reader.model], cost: 0.001 };
      };
      return { readPhoto, calls };
    };

    beforeEach(async () => {
      await db
        .insertInto('arcade_track_names')
        .values([
          { mix_id: MIXES.Phoenix2, track_id: 1, name: 'TRACK 1', name_edist: 0 },
          { mix_id: MIXES.XX, track_id: 1, name: 'Track 1', name_edist: 0 },
        ])
        .execute();
    });

    const getResult = (id: number) =>
      db.selectFrom('results').selectAll().where('id', '=', id).executeTakeFirstOrThrow();

    const getOcrCost = async () =>
      Number(
        (
          await db
            .selectFrom('players')
            .select('ocr_cost')
            .where('id', '=', 7)
            .executeTakeFirstOrThrow()
        ).ocr_cost
      );

    it('saves a Phoenix 2 result after one read, with its hash and cost', async () => {
      // A fuzzy title: within 25% of the arcade name
      const { readPhoto, calls } = stubReader({
        [READER_A.model]: phoenixRead({ song_title: 'TRAСK 1.' }),
      });
      const outcome = await recognizePhoto(input(), readPhoto);
      assert.equal(outcome.status, 'saved');
      assert.deepEqual(calls, [READER_A.model]);
      if (outcome.status !== 'saved') return;
      assert.deepEqual(outcome.chart, { sharedChartId: 3, songName: 'Track 1', label: 'S20' });

      const result = await getResult(outcome.resultId);
      assert.equal(result.photo_sha256, hash);
      assert.equal(result.score, phoenixScore);
      assert.equal(result.grade, 'AA');
      assert.equal(result.is_pass, 1);
      assert.equal(result.mix, MIXES.Phoenix2);
      assert.closeTo(await getOcrCost(), 0.001, 1e-9);
      await applyEffects();
    });

    it('reads again with the other reader when the first read fails', async () => {
      const { readPhoto, calls } = stubReader({
        [READER_A.model]: phoenixRead({ max_combo: 10 }),
        [READER_B.model]: phoenixRead(),
      });
      const outcome = await recognizePhoto(input(), readPhoto);
      assert.equal(outcome.status, 'saved');
      assert.deepEqual(calls, [READER_A.model, READER_B.model]);
      assert.closeTo(await getOcrCost(), 0.002, 1e-9);
    });

    it('asks for input when both reads fail, and saves nothing', async () => {
      const { readPhoto } = stubReader({
        [READER_A.model]: phoenixRead({ max_combo: 10 }),
        [READER_B.model]: phoenixRead({ max_combo: 70 }),
      });
      const outcome = await recognizePhoto(input(), readPhoto);
      assert.equal(outcome.status, 'needsInput');
      if (outcome.status !== 'needsInput') return;
      assert.deepEqual(outcome.fields, ['combo']);
      assert.lengthOf(outcome.reads, 2);
      assert.equal(outcome.chart?.sharedChartId, 3);
      const count = await db
        .selectFrom('results')
        .select(({ fn }) => fn.countAll<number>().as('count'))
        .where('photo_sha256', '=', hash)
        .executeTakeFirstOrThrow();
      assert.equal(Number(count.count), 0);
    });

    it('asks for the chart when the title matches no track of the mix', async () => {
      const { readPhoto } = stubReader({
        [READER_A.model]: phoenixRead({ song_title: 'GLORY OF REVENGE' }),
        [READER_B.model]: phoenixRead({ song_title: 'GLORY OF REVENGE' }),
      });
      const outcome = await recognizePhoto(input(), readPhoto);
      assert.deepEqual(outcome.status === 'needsInput' && outcome.fields, ['chart']);
    });

    it('a label with no chart on the track is no match', async () => {
      const { readPhoto } = stubReader({
        [READER_A.model]: phoenixRead({ level: 21 }),
        [READER_B.model]: phoenixRead({ level: 21 }),
      });
      const outcome = await recognizePhoto(input(), readPhoto);
      assert.deepEqual(outcome.status === 'needsInput' && outcome.fields, ['chart']);
    });

    it('XX: reads with both readers, saves when they agree', async () => {
      const { readPhoto, calls } = stubReader({
        [READER_A.model]: xxRead({ grade: 'A' }),
        [READER_B.model]: xxRead({ grade: 'A' }),
      });
      const outcome = await recognizePhoto(input({ mix: 'XX' }), readPhoto);
      assert.equal(outcome.status, 'saved');
      assert.sameMembers(calls, [READER_A.model, READER_B.model]);
      if (outcome.status !== 'saved') return;
      // A pass A is stored as A+
      assert.equal((await getResult(outcome.resultId)).grade, 'A+');
    });

    it('a known hash is a duplicate, before anything is read', async () => {
      const first = stubReader({ [READER_A.model]: phoenixRead() });
      const saved = await recognizePhoto(input(), first.readPhoto);

      const again = stubReader({ [READER_A.model]: phoenixRead() });
      const outcome = await recognizePhoto(input(), again.readPhoto);
      assert.equal(outcome.status, 'duplicate');
      assert.equal(
        outcome.status === 'duplicate' && saved.status === 'saved' && outcome.resultId,
        saved.status === 'saved' && saved.resultId
      );
      assert.deepEqual(again.calls, []);
    });

    it('a second photo of the same play is a duplicate', async () => {
      const first = stubReader({ [READER_A.model]: phoenixRead() });
      await recognizePhoto(input(), first.readPhoto);

      const second = stubReader({ [READER_A.model]: phoenixRead() });
      const outcome = await recognizePhoto(input({ hash: 'b'.repeat(64) }), second.readPhoto);
      assert.equal(outcome.status, 'duplicate');
      assert.deepEqual(second.calls, [READER_A.model]);
    });

    it('rank mode on a chart that can not have it goes to manual input', async () => {
      await db.updateTable('tracks').set({ duration: 'Short' }).where('id', '=', 1).execute();
      const { readPhoto } = stubReader({
        [READER_A.model]: xxRead({ mod_badges: ['VJ'] }),
        [READER_B.model]: xxRead({ mod_badges: ['VJ'] }),
      });
      const outcome = await recognizePhoto(input({ mix: 'XX' }), readPhoto);
      assert.deepEqual(outcome.status === 'needsInput' && outcome.fields, ['mod']);
    });

    it('a result that the manual checks refuse goes to manual input with the reason', async () => {
      // Over 1.5 times the chart's highest score
      const { readPhoto } = stubReader({
        [READER_A.model]: xxRead({ score: 1_600_000 }),
        [READER_B.model]: xxRead({ score: 1_600_000 }),
      });
      const outcome = await recognizePhoto(input({ mix: 'XX' }), readPhoto);
      assert.equal(outcome.status, 'needsInput');
      if (outcome.status !== 'needsInput') return;
      assert.deepEqual(outcome.fields, [...NUMBER_FIELDS]);
      assert.equal(outcome.message, 'Bad Request: Score is higher than maximum possible');
    });

    it('a single photo is read and checked, but only the user saves it', async () => {
      const { readPhoto } = stubReader({ [READER_A.model]: phoenixRead() });
      const outcome = await recognizePhoto(input({ autoSave: false }), readPhoto);
      assert.equal(outcome.status, 'needsInput');
      if (outcome.status !== 'needsInput') return;
      assert.deepEqual(outcome.fields, []);
      assert.equal(outcome.chart?.sharedChartId, 3);
      assert.equal(outcome.values?.score, phoenixScore);
      assert.isUndefined(
        await db
          .selectFrom('results')
          .select('id')
          .where('photo_sha256', '=', hash)
          .executeTakeFirst()
      );
    });

    it('logs every paid read', async () => {
      const { readPhoto } = stubReader({
        [READER_A.model]: phoenixRead({ max_combo: 10 }),
        [READER_B.model]: phoenixRead(),
      });
      await recognizePhoto(input(), readPhoto);
      const reads = await db.selectFrom('photo_reads').selectAll().execute();
      assert.deepEqual(
        reads.map((read) => [read.player_id, read.photo_sha256, Number(read.cost)]),
        [
          [7, hash, 0.001],
          [7, hash, 0.001],
        ]
      );
    });

    describe('cost limits', () => {
      // Paid reads `hoursAgo`, of photos that gave no result unless `photoHash` has one
      const addReads = async (
        count: number,
        cost: number,
        hoursAgo: number,
        photoHash = 'f'.repeat(64)
      ) => {
        for (let i = 0; i < count; i++) {
          await db
            .insertInto('photo_reads')
            .values({
              player_id: 7,
              photo_sha256: photoHash,
              cost,
              created_at: sql`UTC_TIMESTAMP(3) - INTERVAL ${hoursAgo} HOUR`,
            })
            .execute();
        }
      };
      const limitEvents = () =>
        db.selectFrom('events').select('payload').where('type', '=', 'photoLimitReached').execute();

      it('refuses before reading when the spend without results is over the limit, and tells the admins once', async () => {
        await addReads(20, 0.0015, 2);
        const { readPhoto, calls } = stubReader({ [READER_A.model]: phoenixRead() });
        const outcome = await recognizePhoto(input(), readPhoto);
        assert.equal(outcome.status, 'limited');
        assert.deepEqual(calls, []);
        if (outcome.status !== 'limited') return;
        assert.equal(outcome.limit, 'unproductive');
        // The reads leave the 24 hours window in 22 hours
        const hours = (outcome.retryAt.getTime() - Date.now()) / 3_600_000;
        assert.closeTo(hours, 22, 0.1);

        await recognizePhoto(input(), readPhoto);
        const events = await limitEvents();
        assert.lengthOf(events, 1);
        assert.deepInclude(events[0].payload as object, {
          playerId: 7,
          limit: 'unproductive',
        });
      });

      it('reads that gave a result count only towards the ceiling', async () => {
        await db
          .insertInto('results')
          .values({ ...getResultDefaults({ playerId: 7 }), photo_sha256: 'e'.repeat(64) })
          .execute();
        await addReads(100, 0.001, 2, 'e'.repeat(64));
        const { readPhoto } = stubReader({ [READER_A.model]: phoenixRead() });
        assert.equal((await recognizePhoto(input(), readPhoto)).status, 'saved');
      });

      it('the ceiling counts all spend of the last 3 days', async () => {
        await db
          .insertInto('results')
          .values({ ...getResultDefaults({ playerId: 7 }), photo_sha256: 'e'.repeat(64) })
          .execute();
        await addReads(1, 0.3, 60, 'e'.repeat(64));
        await addReads(1, 0.2, 10, 'e'.repeat(64));
        // Over 3 days ago: not counted
        await addReads(1, 0.5, 73, 'e'.repeat(64));
        const outcome = await recognizePhoto(input(), stubReader({}).readPhoto);
        assert.equal(outcome.status, 'limited');
        if (outcome.status !== 'limited') return;
        assert.equal(outcome.limit, 'total');
        // Under the ceiling once the oldest read leaves the window, in 12 hours
        assert.closeTo((outcome.retryAt.getTime() - Date.now()) / 3_600_000, 12, 0.1);
      });

      it('admins have 10 times the limits', async () => {
        await addReads(20, 0.0015, 2);
        const { readPhoto } = stubReader({ [READER_A.model]: phoenixRead() });
        assert.equal((await recognizePhoto(input({ isAdmin: true }), readPhoto)).status, 'saved');
      });
    });

    it('a reader that fails is like no read; when every reader fails, the error is thrown', async () => {
      const failing: ReadPhoto = async () => {
        throw new Error('timeout');
      };
      try {
        await recognizePhoto(input(), failing);
        assert.fail('should throw');
      } catch (e) {
        assert.equal((e as Error).message, 'timeout');
      }

      const halfFailing: ReadPhoto = async (reader) => {
        if (reader.model === READER_A.model) throw new Error('timeout');
        return { read: phoenixRead(), cost: 0.001 };
      };
      assert.equal((await recognizePhoto(input(), halfFailing)).status, 'saved');
    });
  });

  describe('endpoints', () => {
    const screenshot = `data:image/jpeg;base64,${fs
      .readFileSync(path.join(__dirname, '../files/test.jpg'))
      .toString('base64')}`;
    const hash = 'c'.repeat(64);

    const addResultInput = {
      screenshot,
      fileName: 'photo.jpg',
      playerId: 7,
      grade: 'AA',
      mix: 'Phoenix2',
      mod: '',
      score: phoenixScore,
      perfect: 83,
      great: 17,
      good: 0,
      bad: 0,
      miss: 0,
      combo: 100,
      date: '2026-10-01',
      isExactDate: true,
      sharedChartId: 3,
      pass: true,
      photoHash: hash,
    };

    it('the manual step stores the photo hash, and checkPhotoHashes finds it', async () => {
      const added = await trpcMutation(
        'results.addResultMutation',
        addResultInput,
        addResultsSession
      ).expect(200);
      const { resultId } = output(added);
      assert.equal(
        (
          await db
            .selectFrom('results')
            .select('photo_sha256')
            .where('id', '=', resultId)
            .executeTakeFirstOrThrow()
        ).photo_sha256,
        hash
      );
      await applyEffects();

      const res = await trpcMutation(
        'results.checkPhotoHashes',
        { hashes: [hash, 'd'.repeat(64)] },
        addResultsSession
      ).expect(200);
      assert.deepEqual(output(res), [hash]);
    });

    it('the same photo or the same play can not be added twice', async () => {
      await trpcMutation('results.addResultMutation', addResultInput, addResultsSession).expect(
        200
      );
      const samePhoto = await trpcMutation(
        'results.addResultMutation',
        { ...addResultInput, combo: 99, score: getPhoenixScore({ ...phoenixStats, combo: 99 }) },
        addResultsSession
      ).expect(409);
      assert.equal(errorMessage(samePhoto), 'Conflict: This photo was already added');

      const samePlay = await trpcMutation(
        'results.addResultMutation',
        { ...addResultInput, photoHash: 'e'.repeat(64) },
        addResultsSession
      ).expect(409);
      assert.equal(errorMessage(samePlay), 'Conflict: This result was already added');
      await applyEffects();
    });

    it('photoCharts finds the mix charts by song name and label, played or not', async () => {
      const found = await trpcQuery(
        'results.photoCharts',
        { mix: 'Phoenix2', search: 'track hd' },
        addResultsSession
      ).expect(200);
      assert.deepEqual(output(found), [{ sharedChartId: 4, songName: 'Track 1', label: 'HD18' }]);
    });

    it('checkPhotoHashes needs the add results permission', async () => {
      await trpcMutation('results.checkPhotoHashes', { hashes: [hash] }, null).expect(401);
    });
  });
});
