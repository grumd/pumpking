import type { BotPlayer } from '../platform/players';
import { notificationsForResult, rivalsNotifications } from '../plugins/rivals/notifications';
import type { BestResult, ChartInfo } from '../plugins/rivals/results';
import { addChart, addPlayer, addResult, rivalsPreferences } from './helpers';
import { assert } from 'chai';

const chart: ChartInfo = { id: 1, trackName: 'Track <1>', chartLabel: 'S20', level: 20 };
const header =
  '<a href="https://pumpking.top/#/leaderboard/chart/1"><b>Track &lt;1&gt;  S20</b></a>:';

const player = (p: Partial<BotPlayer> & { id: number; nickname: string }): BotPlayer => ({
  region: null,
  pp: 0,
  telegramId: 1000 + p.id,
  telegramTag: null,
  preferences: rivalsPreferences(),
  ...p,
});

const alice = player({ id: 1, nickname: 'Alice', pp: 100 });
const bob = player({ id: 2, nickname: 'Bob', pp: 200, region: 'RU' });
const carol = player({ id: 3, nickname: 'Carol', pp: 300 });

let nextId = 1;
const result = (owner: BotPlayer, score: number, extra: Partial<BestResult> = {}): BestResult => ({
  id: nextId++,
  player: owner,
  rankMode: 0,
  score,
  scoreIncrease: null,
  exactGainDate: true,
  addedMinsAgo: 0,
  addedSecondsAgo: 0,
  ...extra,
});

describe('Rivals notifications', () => {
  it('tells the owner whom they overtook, and the beaten rival', () => {
    const newRes = result(alice, 950_000, { scoreIncrease: 100_000 });
    const bobRes = result(bob, 900_000, { addedMinsAgo: 120 });

    const [toAlice, toBob, ...rest] = rivalsNotifications(chart, newRes, [bobRes]);

    assert.equal(toAlice.recipient.id, alice.id);
    assert.equal(
      toAlice.html,
      `${header}\n\nYou've got <code>950,000</code>, overtaking:\n\n` +
        '  • <b>Bob</b>  -  <code>900,000</code>  <i>~2hrs</i>\n\n' +
        'You surpass all your rivals!'
    );
    assert.equal(toBob.recipient.id, bob.id);
    assert.equal(
      toBob.html,
      `${header}\n\n<b>Alice</b> опережает твой рекорд на <code>50,000</code> очков:\n` +
        '\n  ↑  <b>Alice</b>  -  <code>950,000</code>\n' +
        '\n  →  <b>твой</b>  -  <code>900,000</code>  <i>~2час</i>'
    );
    assert.isEmpty(rest);
  });

  it('marks a score from a best (no exact date) and a result without a pass', () => {
    const newRes = result(alice, 950_000, { exactGainDate: false });
    const [toAlice] = rivalsNotifications(chart, newRes, []);
    assert.equal(
      toAlice.html,
      `${header}\n\nYou've got best <code>950,000</code>, improving your skill.\n\n` +
        'You surpass all your rivals!'
    );
  });

  it('tells about catching up with an equal score', () => {
    const newRes = result(alice, 900_000);
    const bobRes = result(bob, 900_000, { addedMinsAgo: 120 });

    const [toAlice, toBob] = rivalsNotifications(chart, newRes, [bobRes]);

    assert.equal(
      toAlice.html,
      `${header}\n\nYou've got <code>900,000</code>, improving your skill.\n\n` +
        "Now you're on par with:\n\n  • <b>Bob</b>  -    <i>~2hrs</i>"
    );
    assert.equal(
      toBob.html,
      `${header}\n\n<b>Alice</b> нагоняет твой рекорд:\n` +
        '\n  →  <b>твой</b>  -  <code>900,000</code>  <i>~2час</i>' +
        '\n\n  ↑  <b>Alice</b>  -  <code>900,000</code>\n'
    );
  });

  it('names the closest better result as the next rival', () => {
    const newRes = result(alice, 950_000, { scoreIncrease: 10_000 });
    const [toAlice, ...rest] = rivalsNotifications(chart, newRes, [
      result(carol, 999_000),
      result(bob, 990_000),
    ]);
    assert.equal(
      toAlice.html,
      `${header}\n\nYou've got <code>950,000</code>, improving your skill.\n\n` +
        'Your next rival is <b>Bob</b> with <code>990,000</code>'
    );
    assert.isEmpty(rest);
  });

  it("doesn't tell a rival about charts outside their levels", () => {
    const limitedBob = { ...bob, preferences: rivalsPreferences({ levels: [1, 10] }) };
    const notifications = rivalsNotifications(
      chart,
      result(alice, 950_000, { scoreIncrease: 100_000 }),
      [result(limitedBob, 900_000)]
    );
    assert.deepEqual(
      notifications.map((n) => n.recipient.id),
      [alice.id]
    );
  });

  it('without smart tracking, tells only about the players on the rivals list', () => {
    const newRes = result(alice, 950_000, { scoreIncrease: 100_000 });
    const notSmart = { ...bob, preferences: rivalsPreferences({ trackInferior: false }) };
    assert.lengthOf(rivalsNotifications(chart, newRes, [result(notSmart, 900_000)]), 1);

    const listed = {
      ...bob,
      preferences: rivalsPreferences({ trackInferior: false, list: [alice.id] }),
    };
    assert.lengthOf(rivalsNotifications(chart, newRes, [result(listed, 900_000)]), 2);
  });

  it('only mentions a beaten weaker player when the result improved', () => {
    const weak = player({ id: 4, nickname: 'Weak', pp: 10 });
    // no score increase: a new result without a pass, so nothing improved
    const [toAlice] = rivalsNotifications(chart, result(alice, 950_000), [result(weak, 900_000)]);
    assert.notInclude(toAlice.html, 'Weak');
  });

  describe('for a result in the database', () => {
    beforeEach(async () => {
      await addChart();
      await addPlayer({
        id: 1,
        nickname: 'Alice',
        pp: 100,
        telegramId: 1001,
        preferences: rivalsPreferences(),
      });
      await addPlayer({
        id: 2,
        nickname: 'Bob',
        pp: 200,
        telegramId: 1002,
        preferences: rivalsPreferences(),
      });
      await addPlayer({ id: 5, nickname: 'Hidden', hidden: 1, telegramId: 1005 });
    });

    it("is about the player's best result only", async () => {
      await addResult({ playerId: 2, score: 900_000, addedMinutesAgo: 60 });
      const older = await addResult({ playerId: 1, score: 850_000, addedMinutesAgo: 30 });
      const best = await addResult({ playerId: 1, score: 950_000, scoreIncrease: 100_000 });

      assert.deepEqual(await notificationsForResult(older), []);
      const notifications = await notificationsForResult(best);
      assert.deepEqual(
        notifications.map((n) => n.recipient.nickname),
        ['Alice', 'Bob']
      );
      assert.include(notifications[0].html, '<b>Bob</b>  -  <code>900,000</code>  <i>~60min</i>');
    });

    it('leaves out hidden results, hidden players and other rank modes', async () => {
      await addResult({ playerId: 2, score: 900_000, rankMode: 1 });
      await addResult({ playerId: 5, score: 920_000 });
      const hidden = await addResult({ playerId: 1, score: 990_000, isHidden: 1 });
      const best = await addResult({ playerId: 1, score: 950_000, scoreIncrease: 100_000 });

      assert.deepEqual(await notificationsForResult(hidden), []);
      const notifications = await notificationsForResult(best);
      assert.lengthOf(notifications, 1);
      assert.include(notifications[0].html, 'improving your skill');
    });
  });

  it('skips charts without a level on the latest mix', async () => {
    await addChart({ level: null });
    await addPlayer({
      id: 1,
      nickname: 'Alice',
      telegramId: 1001,
      preferences: rivalsPreferences(),
    });
    assert.deepEqual(
      await notificationsForResult(await addResult({ playerId: 1, score: 900_000 })),
      []
    );
  });
});
