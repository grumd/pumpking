import type { BotConfig } from '../env';
import type { EventPayloads, EventType } from '@pumpking/database/events';

/**
 * The plugin contract of the bot platform (W9 in docs/python-api-migration/PLAN.md).
 * Each feature is a plugin declaring what it reacts to; the platform wires it to
 * Telegram, the job timers and the `events` table.
 */

export interface InlineButton {
  text: string;
  // Callback data, `<plugin>:<action>[:<argument>]` (see `callbackData`)
  data: string;
}

export type Keyboard = InlineButton[][];

/** Sends messages (HTML) to any chat. Tests pass a fake one */
export interface Sender {
  send(chatId: number, html: string, keyboard?: Keyboard): Promise<void>;
}

/** What every handler can use */
export interface BotServices {
  config: BotConfig;
  sender: Sender;
  // Sends to the admin chat, if one is configured
  sendToAdmin(html: string): Promise<void>;
}

/** One incoming message or button press, from a private chat */
export interface ChatContext {
  bot: BotServices;
  chatId: number;
  // The sender's Telegram username (players link their account by it)
  username: string | undefined;
  // The text after the command word, e.g. "add Bob" for "rivals add Bob"
  text: string;
  reply(html: string, keyboard?: Keyboard): Promise<void>;
  // Replaces the message the pressed button belongs to; a plain reply for text messages
  editMessage(html: string, keyboard?: Keyboard): Promise<void>;
}

export interface Command {
  // Works both as `/command` and as a free-text first word ("rivals add Bob")
  command: string;
  // Shown in Telegram's command menu; commands without one aren't listed
  description?: string;
  // Extra free-text words that trigger it (e.g. "hi", "hello")
  aliases?: string[];
  handle(ctx: ChatContext): Promise<void>;
}

export interface Job {
  name: string;
  intervalMs: number;
  run(bot: BotServices): Promise<void>;
}

export type EventHandlers = {
  [T in EventType]?: (payload: EventPayloads[T], bot: BotServices) => Promise<void>;
};

export interface Plugin {
  name: string;
  commands?: Command[];
  // Button handlers by action; the button's data is `<plugin name>:<action>:<argument>`
  callbacks?: Record<string, (ctx: ChatContext, argument: string) => Promise<void>>;
  jobs?: Job[];
  events?: EventHandlers;
}

export const callbackData = (plugin: string, action: string, argument = '') =>
  `${plugin}:${action}:${argument}`;
