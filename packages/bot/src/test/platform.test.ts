import { EVENTS_CONSUMER } from '../platform/platform';
import { splitMessage } from '../platform/telegram';
import type { Plugin } from '../platform/types';
import { rivalsPlugin } from '../plugins/rivals';
import { tournamentsPlugin } from '../plugins/tournaments';
import {
  ADMIN_ID,
  addChart,
  addPlayer,
  addResult,
  chatContext,
  createTestPlatform,
  rivalsPreferences,
  seedTournament,
  testConfig,
} from './helpers';
import { db } from '@pumpking/core/db';
import { addEvent } from '@pumpking/core/events';
import { assert } from 'chai';
import { sql } from 'kysely';

const getCursor = async () =>
  (
    await db
      .selectFrom('event_cursors')
      .select('event_id')
      .where('consumer', '=', EVENTS_CONSUMER)
      .executeTakeFirst()
  )?.event_id;

// Records the events it gets
const recorder = () => {
  const received: number[] = [];
  const plugin: Plugin = {
    name: 'recorder',
    events: {
      tournamentStarted: async ({ tournamentId }) => {
        received.push(tournamentId);
      },
    },
  };
  return { plugin, received };
};

describe('Bot platform', () => {
  describe('events', () => {
    it('start after the events that were there before the first start', async () => {
      await addEvent(db, 'tournamentStarted', { tournamentId: 1 });
      await addEvent(db, 'tournamentStarted', { tournamentId: 2 });
      const { plugin, received } = recorder();
      const { platform } = createTestPlatform([plugin]);

      const stop = await platform.startEvents();
      stop();
      assert.equal(await getCursor(), 2);

      await addEvent(db, 'tournamentStarted', { tournamentId: 3 });
      await platform.processEvents();
      assert.deepEqual(received, [3]);
      assert.equal(await getCursor(), 3);
    });

    it('skips events that are too old to notify about', async () => {
      await db
        .insertInto('events')
        .values({
          type: 'tournamentStarted',
          payload: JSON.stringify({ tournamentId: 1 }),
          created_at: sql`UTC_TIMESTAMP(3) - INTERVAL 1 HOUR`,
        })
        .execute();
      await addEvent(db, 'tournamentStarted', { tournamentId: 2 });
      const { plugin, received } = recorder();
      const { platform } = createTestPlatform([plugin]);

      await platform.processEvents();
      assert.deepEqual(received, [2]);
    });

    it("tells the admin when a plugin fails on an event, and runs the others' handlers", async () => {
      const failing: Plugin = {
        name: 'failing',
        events: {
          tournamentStarted: async () => {
            throw new Error('boom');
          },
        },
      };
      const { plugin, received } = recorder();
      const { platform, sent } = createTestPlatform([failing, plugin]);
      await addEvent(db, 'tournamentStarted', { tournamentId: 1 });

      await platform.processEvents();
      assert.deepEqual(received, [1]);
      assert.deepEqual(sent, [
        {
          chatId: ADMIN_ID,
          html: '❗️  failing failed on event 1 (tournamentStarted):  boom',
          keyboard: undefined,
        },
      ]);
    });

    it('sends the rivals notifications of a new result', async () => {
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
      await addResult({ playerId: 2, score: 900_000 });
      const resultId = await addResult({ playerId: 1, score: 950_000, scoreIncrease: 100_000 });
      await addEvent(db, 'resultAdded', { resultId });
      const { platform, sent } = createTestPlatform([rivalsPlugin]);

      await platform.processEvents();
      assert.deepEqual(
        sent.map((message) => message.chatId),
        [1001, 1002]
      );
    });

    it('posts the tournament to the channel', async () => {
      await seedTournament();
      await addEvent(db, 'tournamentStarted', { tournamentId: 1 });
      await addEvent(db, 'tournamentEnded', { tournamentId: 1 });
      const { platform, sent } = createTestPlatform([tournamentsPlugin]);

      await platform.processEvents();
      assert.deepEqual(
        sent.map((message) => message.chatId),
        [
          testConfig.tournamentsChannelId,
          testConfig.tournamentsChannelId,
          testConfig.tournamentsChannelId,
        ]
      );
      assert.include(sent[2].html, 'has ended');
    });
  });

  describe('messages', () => {
    const echo: Plugin = {
      name: 'echo',
      commands: [
        {
          command: 'echo',
          description: 'Repeats',
          aliases: ['say'],
          handle: async (ctx) => ctx.reply(`echo: ${ctx.text}`),
        },
        {
          command: 'fail',
          handle: async () => {
            throw new Error('a <bad> thing');
          },
        },
      ],
      callbacks: { press: async (ctx, argument) => ctx.editMessage(`pressed ${argument}`) },
    };

    it('picks the command by the first word, or its alias', async () => {
      const { platform } = createTestPlatform([echo]);
      for (const text of ['echo one two', 'SAY one two', '/echo one two']) {
        const chat = chatContext(platform.bot, { text });
        await platform.handleText(chat.ctx);
        assert.deepEqual(chat.replies, ['echo: one two'], text);
      }

      const unknown = chatContext(platform.bot, { text: 'what' });
      await platform.handleText(unknown.ctx);
      assert.deepEqual(unknown.replies, ['Commands:\n/echo - Repeats']);
    });

    it('answers a failure with the error', async () => {
      const { platform } = createTestPlatform([echo]);
      const chat = chatContext(platform.bot, { text: 'fail' });
      await platform.handleText(chat.ctx);
      assert.deepEqual(chat.replies, ['Exception:  a &lt;bad&gt; thing\nPlease report @admin_tag']);
    });

    it('routes buttons to their plugin', async () => {
      const { platform } = createTestPlatform([echo]);
      const chat = chatContext(platform.bot, {});
      await platform.handleCallback('echo:press:12:34', chat.ctx);
      await platform.handleCallback('other:press:1', chat.ctx);
      assert.deepEqual(chat.replies, ['pressed 12:34']);
    });

    it('splits long messages at line breaks', () => {
      const line = 'x'.repeat(1500);
      assert.deepEqual(splitMessage([line, line, line].join('\n')), [`${line}\n${line}`, line]);
      assert.deepEqual(splitMessage('short'), ['short']);
    });
  });

  it('pauses a failing job and tells the admin once', async () => {
    let runs = 0;
    const job: Plugin = {
      name: 'job',
      jobs: [
        {
          name: 'broken job',
          intervalMs: 10,
          run: async () => {
            runs++;
            throw new Error('down');
          },
        },
      ],
    };
    const { platform, sent } = createTestPlatform([job]);
    const stop = platform.startJobs();
    await new Promise((resolve) => setTimeout(resolve, 100));
    stop();
    assert.equal(runs, 1);
    assert.deepEqual(
      sent.map((message) => message.html),
      ['❗️  broken job exception:  down, task paused']
    );
  });
});
