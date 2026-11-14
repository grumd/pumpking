import type { BotConfig } from '../env';
import type { EventPayloads, EventType } from '@pumpking/database/events';

export interface InlineButton {
  text: string;
  data: string;
}

export type Keyboard = InlineButton[][];

export interface Sender {
  send(chatId: number, html: string, keyboard?: Keyboard): Promise<void>;
}

export interface BotServices {
  config: BotConfig;
  sender: Sender;
  sendToAdmin(html: string): Promise<void>;
}

export interface ChatContext {
  bot: BotServices;
  chatId: number;
  username: string | undefined;
  text: string;
  reply(html: string, keyboard?: Keyboard): Promise<void>;
  editMessage(html: string, keyboard?: Keyboard): Promise<void>;
}

export interface Command {
  command: string;
  // Shown in Telegram's command menu; commands without one aren't listed
  description?: string;
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
  callbacks?: Record<string, (ctx: ChatContext, argument: string) => Promise<void>>;
  jobs?: Job[];
  events?: EventHandlers;
}

export const callbackData = (plugin: string, action: string, argument = '') =>
  `${plugin}:${action}:${argument}`;
