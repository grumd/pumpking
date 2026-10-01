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
// After downtime, events older than this are skipped instead of notifying about them late
const STALE_EVENT_SECONDS = 30 * 60;
// A failing job pauses for this long, doubling with each failure in a row, up to the max
const JOB_PAUSE_MS = 10 * 60 * 1000;
const JOB_MAX_PAUSE_MS = 6 * 60 * 60 * 1000;

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

// The first word of a text, and the rest
export const splitFirstWord = (text: string): [string, string] => {
  const words = text.trim().split(/\s+/);
  return [words[0] ?? '', words.slice(1).join(' ')];
};

/**
 * Starting from no cursor, the bot skips the events already stored: it would otherwise
 * replay the whole retention period (30 days) of notifications
 */
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

  const helpText = () =>
    'Commands:\n' +
    commands
      .filter((command) => command.description)
      .map((command) => `/${command.command} - ${command.description}`)
      .join('\n');

  /** A `/command`; `ctx.text` is what follows it */
  const handleCommand = (name: string, ctx: ChatContext) => {
    const command = commands.find((c) => c.command === name);
    return runHandler(ctx, async () => {
      if (command) {
        await command.handle(ctx);
      } else {
        await ctx.reply(helpText());
      }
    });
  };

  /** A plain text message: its first word picks the command, like "rivals add Bob" */
  const handleText = (ctx: ChatContext) => {
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

  /** A button press, with the data `<plugin>:<action>:<argument>` */
  const handleCallback = (data: string, ctx: ChatContext) => {
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

  // Each plugin's handler runs on its own: one failing doesn't repeat the others
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

  // Polls the events; the next poll is scheduled when the current one ends
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

  // A job runs every `intervalMs`. When it fails, the admin is told and it pauses
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
