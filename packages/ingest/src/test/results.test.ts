import { app } from '../app';
import { getEvents, getResults, phoenixResult, post, screen, xxResult, xxScreen } from './helpers';
import { CHARTS } from './seed';
import { db } from '@pumpking/core/db';
import { assert } from 'chai';
import request from 'supertest';

const submit = (body: object) => post('/results/screen/submit', body);
const validate = (body: object) => post('/results/screen/validate', body);

// The reason a changed Phoenix result is turned down with
const rejection = async (change: (result: Record<string, unknown>) => void) => {
  const result: Record<string, unknown> = phoenixResult();
  change(result);
  const res = await validate(screen({ result }));
  assert.lengthOf(res.body.validation, 1);
  assert.isFalse(res.body.validation[0].valid, JSON.stringify(res.body));
  return res.body.validation[0].reason;
};

describe('Result submissions', () => {
  it('turn down calls without a known agent', async () => {
    const res = await request(app).post('/results/screen/submit').send(screen()).expect(200);
    assert.deepEqual(res.body, { error: 'permission denied' });

    const wrongToken = await post('/results/screen/submit', screen(), {
      name: 'test-arcade',
      token: 'wrong',
    });
    assert.deepEqual(wrongToken.body, { error: 'permission denied' });
  });

  it('add a valid result with its event, and learn the chart steps from it', async () => {
    const res = await submit(screen());

    const [result] = await getResults();
    assert.deepEqual(res.body, {
      updates: [{ status: 'result added' }],
      report: [
        `Chart #12 got max_total_steps '652' from result #${result.id}`,
        `Chart #12 got min_total_steps '652' from result #${result.id}`,
        "Chart #12 update: '{'max_total_steps': 652, 'min_total_steps': 652}'",
        "Result operation: 'result added'",
      ],
    });
    assert.include(result, {
      screen_file: 'test-arcade/2026-09-30/2026-09-30--23-12-25.mp4',
      recognition_notes: 'result',
      agent: 2,
      track_name: 'Love Is A Danger Zone (Cranky Mix)',
      mix_name: 'Phoenix',
      mix: 27,
      chart_label: 'S16',
      chart_instance: CHARTS.phoenix.id,
      shared_chart: 1,
      player_name: 'ALICE',
      recognized_player_id: 1,
      player_id: 1,
      gained: '2026-09-30 20:12:25',
      exact_gain_date: 1,
      rank_mode: 0,
      mods_list: 'AV500 BGADARK',
      score: 991_925,
      score_phoenix: 991_925,
      score_increase: 991_925,
      grade: 'SSS',
      is_pass: 1,
      plate: 'MG',
      perfects: 648,
      max_combo: 216,
      is_new_best_score: 0,
    });
    assert.lengthOf(result.token, 10);

    const events = await getEvents();
    assert.deepEqual(
      events.map((e) => [e.type, e.payload]),
      [['resultAdded', { resultId: result.id }]]
    );
    const chart = await db
      .selectFrom('chart_instances')
      .select(['min_total_steps', 'max_total_steps'])
      .where('id', '=', CHARTS.phoenix.id)
      .executeTakeFirstOrThrow();
    assert.deepEqual(chart, { min_total_steps: 652, max_total_steps: 652 });
  });

  it('merge the same play recognized again', async () => {
    await submit(screen());
    const [result] = await getResults();

    const again = await submit(screen());
    assert.deepEqual(again.body.updates, [{ status: `result #${result.id} is up-to-date` }]);
    assert.lengthOf(await getEvents(), 1);

    // A few seconds later on another frame of the screen: the newer recognition wins
    const later = await submit(screen({ screen_file: 'other.mp4', gained: '2026-09-30 20:12:30' }));
    assert.deepEqual(later.body, {
      updates: [{ status: `result #${result.id} updated` }],
      report: [
        `Result #${result.id} update: '{'screen_file': ('test-arcade/2026-09-30/2026-09-30--23-12-25.mp4', 'test-arcade/other.mp4'), 'gained': ('2026-09-30 20:12:25', '2026-09-30 20:12:30')}'`,
        `Result operation: 'result #${result.id} updated'`,
      ],
    });
    assert.lengthOf(await getEvents(), 2);

    // Much later, the same score is another play
    const another = await submit(screen({ gained: '2026-09-30 21:00:00' }));
    assert.deepEqual(another.body.updates, [{ status: 'result added' }]);
    assert.lengthOf(await getResults(), 2);
  });

  it('give XX results a phoenix score from the stats, and pass and rank mode', async () => {
    const res = await submit(xxScreen());
    assert.deepEqual(res.body.updates, [{ status: 'result added' }]);
    const vj = await submit(
      xxScreen({ ...xxResult(), score: 1_418_700, grade: 'A', mods_list: 'VJ 2X' })
    );
    assert.deepEqual(vj.body.updates, [{ status: 'result added' }]);

    const [plain, rankMode] = await getResults();
    // ⌈(995 × (1000 × 648 + 600 × 2 + 200 × 2 + 100 × 4) + 5000 × 216) / 658⌉
    assert.include(plain, { mix: 26, score_phoenix: 984_545, is_pass: 1, rank_mode: 0 });
    assert.include(rankMode, { is_pass: 0, rank_mode: 1, mods_list: 'VJ 2X' });

    const hj = await validate(xxScreen({ ...xxResult(), mods_list: 'VJ HJ' }));
    assert.deepEqual(hj.body.validation, [
      { valid: false, reason: "Rank mode and HJ can't be set simultaneously" },
    ]);
    const tooLow = await validate(xxScreen({ ...xxResult(), score: 100_000 }));
    assert.deepEqual(tooLow.body.validation, [
      { valid: false, reason: 'Invalid score: 100,000 is too low for stats specified' },
    ]);
    const notRounded = await validate(xxScreen({ ...xxResult(), score: 1_318_750 }));
    assert.deepEqual(notRounded.body.validation, [
      { valid: false, reason: 'Invalid score: 1,318,750 is not a multiple of 100' },
    ]);
  });

  it('send unrecognized screen results to purgatory, and reject manual ones', async () => {
    const result = { ...phoenixResult(), player_name: 'BOBBY' };
    const reason = 'Unknown player BOBBY for mix Phoenix, closest is BOB with 2 edits';

    const res = await submit(screen({ result }));
    const [row] = await db.selectFrom('purgatory').selectAll().execute();
    assert.deepEqual(res.body, { updates: [{ status: 'added to purgatory', id: row.id, reason }] });
    assert.include(row, {
      reason,
      player_name: 'BOBBY',
      screen_file: 'test-arcade/2026-09-30/2026-09-30--23-12-25.mp4',
      mix_name: 'Phoenix',
      chart_label: 'S16',
      score: 991_925,
      perfects: 648,
      is_pass: 1,
      exact_gain_date: 1,
    });

    const manual = await post('/results/manual/submit', screen({ result }));
    assert.deepEqual(manual.body, { updates: [{ status: 'discarded', reason }] });
    assert.lengthOf(await db.selectFrom('purgatory').select('id').execute(), 1);
    assert.lengthOf(await getResults(), 0);
    assert.lengthOf(await getEvents(), 0);
  });

  it('discard the results nobody needs', async () => {
    const discarded = async (body: object) => (await submit(body)).body.updates[0];

    assert.deepEqual(await discarded(screen({ result: { ...phoenixResult(), score: 0 } })), {
      status: 'discarded',
      reason: 'Empty score, not needed',
    });
    assert.deepEqual(
      await discarded(screen({ left: { chart_label: 'SP', result: phoenixResult() } })),
      {
        status: 'discarded',
        reason: 'UCS results are not handled',
      }
    );
    assert.deepEqual(await discarded(screen({ track_name: 'RANDOM TRAIN 3' })), {
      status: 'discarded',
      reason: 'Random train results are not handled',
    });
    assert.deepEqual(
      await discarded(screen({ result: { ...phoenixResult(), player_name: 'SPAMMER' } })),
      { status: 'discarded', reason: "Player #4 'Spammer' results are discarded" }
    );
    assert.lengthOf(await getResults(), 0);
    assert.lengthOf(await db.selectFrom('purgatory').select('id').execute(), 0);
  });

  it('check Phoenix stats against the score, grade and plate', async () => {
    assert.equal(
      await rejection((r) => (r.score = 991_000)),
      'Invalid score 991,000 for specified stats, should be ~ 991,925'
    );
    assert.equal(
      await rejection((r) => (r.grade = 'SS')),
      "Invalid grade 'SS' for specified stats, should be 'SSS'"
    );
    assert.equal(
      await rejection((r) => (r.plate = 'SG')),
      "Invalid plate 'SG' for specified stats, should be 'MG'"
    );
    assert.equal(
      await rejection((r) => (r.is_pass = false)),
      "Invalid plate 'MG' for specified stats, should be 'None'"
    );
    assert.equal(await rejection((r) => delete r.is_pass), 'Pass status is unknown');
    assert.equal(
      await rejection((r) => (r.max_combo = 700)),
      'Invalid max_combo 700 with 648 perfects and 1 greats'
    );
    assert.equal(await rejection((r) => delete r.goods), 'Result with no stats');
    assert.equal(await rejection((r) => (r.goods = '1')), "'goods' is of type 'string'");
    assert.equal(await rejection((r) => (r.mods_list = 'AV500 VJ')), "Mod 'VJ' is invalid");
    assert.equal(await rejection((r) => delete r.mods_list), 'Missing mods list');
    assert.equal(
      await rejection((r) => (r.score_increase = 1_000_000)),
      'Invalid score_increase: 1,000,000 > score 991,925'
    );
  });

  it('check the number of steps against the chart, give or take one', async () => {
    const setSteps = (min: number, max: number) =>
      db
        .updateTable('chart_instances')
        .set({ min_total_steps: min, max_total_steps: max })
        .where('id', '=', CHARTS.phoenix.id)
        .execute();

    await setSteps(700, 700);
    assert.equal(
      await rejection(() => {}),
      'Number of steps 652 is lesser than chart #12 min 700 steps'
    );
    await setSteps(600, 600);
    assert.equal(
      await rejection(() => {}),
      'Number of steps 652 is higher than chart #12 max 600 steps'
    );
    await setSteps(653, 653);
    const res = await validate(screen());
    assert.deepEqual(res.body.validation, [{ valid: true, update: { status: 'result added' } }]);
  });

  it('match track names within their tolerance, and give best guesses', async () => {
    const reason = async (trackName: string, label = 'S16') => {
      const res = await validate(
        screen({ track_name: trackName, left: { chart_label: label, result: phoenixResult() } })
      );
      return res.body.validation[0].reason;
    };

    const typo = await validate(screen({ track_name: 'Love Is A Danger Zone [Crnky Mix]' }));
    assert.isTrue(typo.body.validation[0].valid);
    assert.equal(
      await reason('Final Audition Ep. 2-9', 'S12'),
      "Invalid track name 'Final Audition Ep. 2-9', best guess is #2 (0F__Final_Audition_ep_2_X) ed-1 / #3 (0D__Final_Audition_ep_2_1) ed-1"
    );
    assert.equal(
      await reason('Qwerty Asdfgh'),
      "Invalid track name 'Qwerty Asdfgh', no best guess"
    );
    assert.equal(
      await reason('Love Is A Danger Zone (Cranky Mix)', 'S99'),
      "Invalid chart 'S99' in mix Phoenix on track(s) #1 (13__Love_is_a_Danger_Zone_Cranky_Mix)"
    );
  });

  it('resolve players: aliases, Phoenix 2 ids, names too close to pick', async () => {
    const recognized = async (playerName: string, mixName = 'Phoenix') => {
      const res = await submit(
        screen({ mix_name: mixName, result: { ...phoenixResult(), player_name: playerName } })
      );
      return res.body.updates[0];
    };

    assert.deepEqual(await recognized('ALICEALT'), { status: 'result added' });
    // The same play: only the recognized name is new
    assert.deepEqual(await recognized('AL ICE', 'Phoenix'), {
      status: `result #${(await getResults())[0].id} updated`,
    });
    assert.deepEqual(await recognized('alice #1235', 'Phoenix2'), { status: 'result added' });
    const results = await getResults();
    assert.deepEqual(
      results.map((r) => [r.recognized_player_id, r.mix]),
      [
        [1, 27],
        [1, 28],
      ]
    );

    const ambiguous = await recognized('CAROLX');
    assert.equal(
      ambiguous.reason,
      "Unknown player CAROLX, can't decide between CAROLA with 1 edits and CAROLB with 1 edits"
    );
  });

  it('merge a manual result into the same play, with a grade if it has none', async () => {
    await submit(xxScreen());
    const [original] = await getResults();

    // Imported later, from another screen, without the grade
    const manual = await post(
      '/results/manual/submit',
      xxScreen(
        { ...xxResult(), grade: '?' },
        { gained: '2026-09-30 21:00:00', screen_file: 'import.jpg' }
      )
    );
    assert.deepEqual(manual.body.updates, [{ status: `result #${original.id} updated` }]);
    const [merged] = await getResults();
    assert.include(merged, {
      grade: 'A+',
      gained: '2026-09-30 21:00:00',
      screen_file: 'test-arcade/import.jpg',
    });

    // Other stats: another play with the same score
    const other = await post(
      '/results/manual/submit',
      xxScreen({ ...xxResult(), max_combo: 215 }, { screen_file: 'import2.jpg' })
    );
    assert.deepEqual(other.body.updates, [{ status: 'result added' }]);
    assert.lengthOf(await getResults(), 2);
  });

  it('validate without writing anything', async () => {
    const res = await validate(screen());
    assert.deepEqual(res.body, {
      validation: [{ valid: true, update: { status: 'result added' } }],
      report: [
        "Chart #12 got max_total_steps '652' from result #-1",
        "Chart #12 got min_total_steps '652' from result #-1",
        "Chart #12 update: '{'max_total_steps': 652, 'min_total_steps': 652}'",
        "Result operation: 'result added'",
      ],
    });
    const discarded = await validate(screen({ track_name: 'RANDOM TRAIN' }));
    assert.deepEqual(discarded.body.validation, [
      { valid: true, discardReason: 'Random train results are not handled' },
    ]);

    assert.lengthOf(await getResults(), 0);
    assert.lengthOf(await getEvents(), 0);
    const chart = await db
      .selectFrom('chart_instances')
      .select('max_total_steps')
      .where('id', '=', CHARTS.phoenix.id)
      .executeTakeFirstOrThrow();
    assert.isNull(chart.max_total_steps);
  });

  it('store both sides of a screen, and report XX bests that repeat the result', async () => {
    const bobResult = { ...xxResult(), player_name: 'BOB' };
    const res = await submit(
      screen({
        mix_name: 'XX',
        left: {
          chart_label: 'S15',
          result: xxResult(),
          personal_best: { player_name: 'ALICE', score: 1_318_700, grade: 'A+' },
        },
        right: { chart_label: 'S15', result: bobResult },
      })
    );
    assert.deepEqual(res.body.updates, [{ status: 'result added' }, { status: 'result added' }]);
    assert.include(
      res.body.report,
      'left_personal_best has grade and score equal to left_result, discarded'
    );
    assert.deepEqual(
      (await getResults()).map((r) => r.player_id),
      [1, 2]
    );
  });

  it('answer a malformed screen with an error', async () => {
    const { track_name: _trackName, ...withoutTrack } = screen();
    assert.deepEqual((await submit(withoutTrack)).body, {
      error: "Expected field 'track_name' not found",
    });
    assert.deepEqual((await submit(screen({ gained: '30.09.2026 20:12' }))).body, {
      error: "time data '30.09.2026 20:12' does not match format '%Y-%m-%d %H:%M:%S'",
    });
  });
});
