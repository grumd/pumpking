import {
  getPreferences,
  migratePreferences,
  NotRegisteredError,
  savePreferences,
  type BotPreferences,
} from '../platform/preferences';
import { accountPlugin, linkPlayer } from '../plugins/account';
import { rivalsPlugin } from '../plugins/rivals';
import { addPlayer, chatContext, createTestPlatform, rivalsPreferences } from './helpers';
import { db } from '@pumpking/core/db';
import { assert } from 'chai';

describe('Preferences', () => {
  it('brings stored preferences up to the current version', () => {
    const defaults: BotPreferences = {
      version: 2,
      rivals: { list: [], levels: [0, 99], track: true, trackInferior: true },
    };
    assert.deepEqual(migratePreferences(null), defaults);
    assert.deepEqual(migratePreferences({}), defaults);
    assert.deepEqual(
      migratePreferences({ version: 1, rivals: { list: [3], levels: [10, 20], track: false } }),
      { version: 2, rivals: { list: [3], levels: [10, 20], track: false, trackInferior: true } }
    );
    // up to date: left as is
    const current = rivalsPreferences({ trackInferior: false });
    assert.deepEqual(migratePreferences(current), current);
  });

  it('are read and saved for the linked chat', async () => {
    await addPlayer({ id: 1, nickname: 'Alice', telegramId: 1001 });
    const prefs = await getPreferences(1001);
    prefs.rivals.list.push(7);
    await savePreferences(1001, prefs);
    assert.deepEqual((await getPreferences(1001)).rivals.list, [7]);

    try {
      await getPreferences(1002);
      assert.fail('should throw');
    } catch (error) {
      assert.instanceOf(error, NotRegisteredError);
    }
  });
});

describe('Account link', () => {
  beforeEach(async () => {
    await addPlayer({ id: 1, nickname: 'Alice', telegramTag: 'alice_tg' });
  });

  it('links a chat to the player with that Telegram tag', async () => {
    assert.deepEqual(await linkPlayer('nobody', 1001), {
      error: 'Player with tag nobody was not found',
    });
    assert.deepEqual(await linkPlayer('alice_tg', 1001), { nickname: 'Alice', isNew: true });
    const { telegram_id } = await db
      .selectFrom('players')
      .select('telegram_id')
      .where('id', '=', 1)
      .executeTakeFirstOrThrow();
    assert.equal(telegram_id, 1001);

    assert.deepEqual(await linkPlayer('alice_tg', 1001), { nickname: 'Alice', isNew: false });
    assert.deepEqual(await linkPlayer('alice_tg', 1002), {
      error: "Player with tag alice_tg doesnt' match id 1002",
    });
  });

  it('answers "hi" and /register', async () => {
    const { platform } = createTestPlatform([accountPlugin, rivalsPlugin]);

    const hi = chatContext(platform.bot, { username: 'alice_tg', text: 'Hi' });
    await platform.handleText(hi.ctx);
    assert.deepEqual(hi.replies, [
      "Oh! You're that <b>Alice</b>, now I know you!\n\nYou may probably want to set your <b>rivals</b>?",
    ]);

    const register = chatContext(platform.bot, { username: 'alice_tg' });
    await platform.handleCommand('register', register.ctx);
    assert.match(register.replies[0], /^Greetings! Glad to see you again, <b>Alice<\/b>/);

    const stranger = chatContext(platform.bot, { chatId: 1002, username: 'bob' });
    await platform.handleCommand('register', stranger.ctx);
    assert.deepEqual(stranger.replies, [
      'Error occured on player link: Player with tag bob was not found\nPlease report @admin_tag',
    ]);
  });
});

describe('Rivals settings', () => {
  beforeEach(async () => {
    await addPlayer({ id: 1, nickname: 'Alice', telegramId: 1001 });
    await addPlayer({ id: 2, nickname: 'Bob Two', telegramId: 1002 });
  });

  const run = async (text: string, { chatId = 1001, username = 'alice' } = {}) => {
    const { platform } = createTestPlatform([rivalsPlugin]);
    const chat = chatContext(platform.bot, { chatId, username, text });
    await platform.handleText(chat.ctx);
    return chat.replies;
  };

  it('adds and removes rivals, switches tracking and levels', async () => {
    assert.deepEqual(await run('rivals add bob two'), ['<b>Bob Two</b> added to your rivals']);
    assert.deepEqual(await run('rivals add Bob Two'), [
      'You already have <b>Bob Two</b> as your rival',
    ]);
    assert.deepEqual(await run('rivals add Nobody'), ["I don't know player <b>Nobody</b>"]);
    assert.deepEqual(await run('rivals off'), ['Rivals tracking is turned <b>off</b>']);
    assert.deepEqual(await run('rivals smart off'), ['Smart tracking is turned <b>off</b>']);
    assert.deepEqual(await run('rivals levels 20 15'), [
      'Tracked chart levels are <code>15</code> - <code>20</code>',
    ]);
    assert.deepEqual(await run('rivals levels 0 15'), ['Allowed chart levels - 1..30']);

    assert.deepEqual(await run('rivals'), [
      "You <b>don't</b> track your rivals\nYour rivals are: Bob Two\n" +
        'Tracked chart levels:  <code>15</code> - <code>20</code>\n' +
        "You don't use smart players tracking\n\nUse <code>rivals help</code> to see other options",
    ]);

    assert.deepEqual(await run('rivals remove Bob Two'), [
      '<b>Bob Two</b> removed from your rivals',
    ]);
    assert.deepEqual((await getPreferences(1001)).rivals, {
      list: [],
      levels: [15, 20],
      track: false,
      trackInferior: false,
    });
  });

  it('shows the test command in the help only to the admin', async () => {
    assert.notInclude((await run('rivals help'))[0], 'rivals test');
    assert.include((await run('rivals help', { username: 'admin_tag' }))[0], 'rivals test');
    assert.deepEqual(await run('rivals test 10 Alice'), ["It's a service command only, sorry"]);
  });

  it('asks an unknown chat to register first', async () => {
    assert.deepEqual(await run('rivals', { chatId: 5555 }), [new NotRegisteredError().message]);
  });
});
