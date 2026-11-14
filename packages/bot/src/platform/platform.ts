import type { BotConfig } from '../env';
import { NotRegisteredError } from './preferences';
import { wrap } from './texts';
import type { BotServices, ChatContext, Command, Job, Plugin, Sender } from './types';
import { db } from '@pumpking/database/db';
import { createEventConsumer, type Event } from '@pumpking/database/events';
import createDebug from 'debug';
import { sql } from 'kysely';

const debug = createDebug('bot:platform');

export const EVENTS_CONSUMER = 'bot';
const EVENTS_POLL_INTERVAL_MS = 1000;
const STALE_EVENT_SECONDS = 30 * 60;
const JOB_PAUSE_MS = 10 * 60 * 1000;
const JOB_MAX_PAUSE_MS = 6 * 60 * 60 * 1000;

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

export const splitFirstWord = (text: string): [string, string] => {
  const words = text.trim().split(/\s+/);
  return [words[0] ?? '', words.slice(1).join(' ')];
};

export const initEventsCursor = async () => {
  await sql`
    INSERT IGNORE INTO event_cursors (consumer, event_id, updated_at)
    SELECT ${EVENTS_CONSUMER}, COALESCE(MAX(id), 0), UTC_TIMESTAMP(3) FROM events
  `.execute(db);
};

const isStale = async (eventId: number) => {
  const row = await db
    .selectFrom('events')
    .select(sql<number>`TIMESTAMPDIFF(SECOND, created_at, UTC_TIMESTAMP(3))`.as('age'))
    .where('id', '=', eventId)
    .executeTakeFirst();
  return !row || Number(row.age) > STALE_EVENT_SECONDS;
};

export const createPlatform = (plugins: Plugin[], config: BotConfig, sender: Sender) => {
  const bot: BotServices = {
    config,
    sender,
    sendToAdmin: async (html) => {
      if (config.adminId) {
        await sender.send(config.adminId, html);
      }
    },
  };

  const commands: Command[] = plugins.flatMap((plugin) => plugin.commands ?? []);

  const runHandler = async (ctx: ChatContext, handle: () => Promise<void>) => {
    try {
      await handle();
    } catch (error) {
      if (error instanceof NotRegisteredError) {
        await ctx.reply(error.message);
        return;
      }
      console.error(`Bot: failed on message "${ctx.text}" from ${ctx.username}`, error);
      await ctx.reply(
        `Exception:  ${wrap(errorMessage(error))}\nPlease report @${
          config.adminNickname ?? 'admin'
        }`
      );
    }
  };

  const logIncoming = (ctx: ChatContext, what: string) =>
    console.log(`Bot: ${ctx.username ? `@${ctx.username}` : ctx.chatId} > ${what}`);

  const helpText = () =>
    'Commands:\n' +
    commands
      .filter((command) => command.description)
      .map((command) => `/${command.command} - ${command.description}`)
      .join('\n');

  const handleCommand = (name: string, ctx: ChatContext) => {
    logIncoming(ctx, `/${name} ${ctx.text}`.trim());
    const command = commands.find((c) => c.command === name);
    return runHandler(ctx, async () => {
      if (command) {
        await command.handle(ctx);
      } else {
        await ctx.reply(helpText());
      }
    });
  };

  const handleText = (ctx: ChatContext) => {
    logIncoming(ctx, ctx.text);
    const [word, rest] = splitFirstWord(ctx.text);
    const lower = word.toLowerCase().replace(/^\//, '');
    const command = commands.find((c) => c.command === lower || c.aliases?.includes(lower));
    const commandCtx = { ...ctx, text: rest };
    return runHandler(commandCtx, async () => {
      if (command) {
        await command.handle(commandCtx);
      } else {
        await ctx.reply(helpText());
      }
    });
  };

  const handleCallback = (data: string, ctx: ChatContext) => {
    logIncoming(ctx, `button ${data}`);
    const [pluginName, action, ...argument] = data.split(':');
    const handle = plugins.find((plugin) => plugin.name === pluginName)?.callbacks?.[action];
    return runHandler(ctx, async () => {
      if (handle) {
        await handle(ctx, argument.join(':'));
      } else {
        debug(`Unknown button data "${data}"`);
      }
    });
  };

  const handleEvent = async (event: Event) => {
    const handlers = plugins.flatMap((plugin) => {
      const handler = plugin.events?.[event.type] as
        | ((payload: unknown, bot: BotServices) => Promise<void>)
        | undefined;
      return handler ? [{ plugin: plugin.name, handler }] : [];
    });
    if (handlers.length === 0) {
      return;
    }
    if (await isStale(event.id)) {
      debug(`Skipping event ${event.id} (${event.type}): too old`);
      return;
    }
    for (const { plugin, handler } of handlers) {
      try {
        await handler(event.payload, bot);
      } catch (error) {
        console.error(`Bot: ${plugin} failed on event ${event.id} (${event.type})`, error);
        await bot.sendToAdmin(
          `❗️  ${plugin} failed on event ${event.id} (${event.type}):  ${wrap(
            errorMessage(error)
          )}`
        );
      }
    }
  };

  const eventsConsumer = createEventConsumer(EVENTS_CONSUMER, handleEvent);

  const startEvents = async () => {
    await initEventsCursor();
    let isStopped = false;
    let timer: NodeJS.Timeout | undefined;
    const poll = async () => {
      try {
        await eventsConsumer.processBatch();
      } catch (error) {
        console.error('Bot: failed to read events', error);
      }
      if (!isStopped) {
        timer = setTimeout(poll, EVENTS_POLL_INTERVAL_MS);
      }
    };
    poll();
    return () => {
      isStopped = true;
      clearTimeout(timer);
    };
  };

  const startJob = (job: Job) => {
    let isStopped = false;
    let timer: NodeJS.Timeout | undefined;
    let failures = 0;
    const tick = async () => {
      let delay = job.intervalMs;
      try {
        await job.run(bot);
        if (failures > 0) {
          await bot.sendToAdmin(`✅  ${job.name} works again`);
        }
        failures = 0;
      } catch (error) {
        failures++;
        delay = Math.min(JOB_PAUSE_MS * 2 ** (failures - 1), JOB_MAX_PAUSE_MS);
        console.error(`Bot: ${job.name} failed (${failures} in a row)`, error);
        if (failures === 1) {
          await bot.sendToAdmin(
            `❗️  ${job.name} exception:  ${wrap(errorMessage(error))}, task paused`
          );
        }
      }
      if (!isStopped) {
        timer = setTimeout(tick, delay);
      }
    };
    tick();
    return () => {
      isStopped = true;
      clearTimeout(timer);
    };
  };

  const startJobs = () => {
    const stops = plugins.flatMap((plugin) => plugin.jobs ?? []).map(startJob);
    return () => stops.forEach((stop) => stop());
  };

  return {
    bot,
    commands,
    handleCommand,
    handleText,
    handleCallback,
    handleEvent,
    processEvents: eventsConsumer.processBatch,
    startEvents,
    startJobs,
  };
};

export type Platform = ReturnType<typeof createPlatform>;
