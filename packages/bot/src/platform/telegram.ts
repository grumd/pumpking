import type { Platform } from './platform';
import type { ChatContext, Keyboard, Sender } from './types';
import { GrammyError, type Api, type Bot, type Context } from 'grammy';

// Telegram's limit is 4096 characters; longer messages are split at line breaks
const MAX_MESSAGE_LENGTH = 4000;
// Telegram allows about 30 messages a second overall
const SEND_INTERVAL_MS = 50;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const replyMarkup = (keyboard?: Keyboard) =>
  keyboard && {
    inline_keyboard: keyboard.map((row) =>
      row.map((button) => ({ text: button.text, callback_data: button.data }))
    ),
  };

export const splitMessage = (html: string): string[] => {
  const parts: string[] = [];
  let current = '';
  for (const line of html.split('\n')) {
    if (current && current.length + 1 + line.length > MAX_MESSAGE_LENGTH) {
      parts.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  parts.push(current);
  return parts;
};

/** Sends one message at a time, waiting when Telegram says too many were sent */
export const createTelegramSender = (api: Api): Sender => {
  let queue = Promise.resolve();

  const sendPart = async (chatId: number, text: string, keyboard?: Keyboard) => {
    const options = { parse_mode: 'HTML' as const, reply_markup: replyMarkup(keyboard) };
    try {
      await api.sendMessage(chatId, text, options);
    } catch (error) {
      if (error instanceof GrammyError && error.error_code === 429) {
        await sleep((error.parameters.retry_after ?? 1) * 1000);
        await api.sendMessage(chatId, text, options);
      } else {
        throw error;
      }
    }
  };

  const sendNow = async (chatId: number, html: string, keyboard?: Keyboard) => {
    const parts = splitMessage(html);
    try {
      for (const [index, part] of parts.entries()) {
        await sendPart(chatId, part, index === parts.length - 1 ? keyboard : undefined);
        await sleep(SEND_INTERVAL_MS);
      }
    } catch (error) {
      // e.g. the user blocked the bot: nothing to do about it
      console.error(`Bot: error sending a message to ${chatId}`, error);
    }
  };

  return {
    send: (chatId, html, keyboard) => {
      const sent = queue.then(() => sendNow(chatId, html, keyboard));
      queue = sent;
      return sent;
    },
  };
};

const chatContext = (platform: Platform, ctx: Context, text: string): ChatContext | undefined => {
  const chatId = ctx.chat?.id;
  if (chatId === undefined) {
    return undefined;
  }
  const reply = (html: string, keyboard?: Keyboard) =>
    platform.bot.sender.send(chatId, html, keyboard);
  return {
    bot: platform.bot,
    chatId,
    username: ctx.from?.username,
    text,
    reply,
    editMessage: async (html, keyboard) => {
      if (ctx.callbackQuery) {
        try {
          await ctx.editMessageText(html, {
            parse_mode: 'HTML',
            reply_markup: replyMarkup(keyboard),
          });
        } catch (error) {
          // Pressing the same button again changes nothing, which Telegram calls an error
          if (!(error instanceof GrammyError && error.description.includes('not modified'))) {
            throw error;
          }
        }
      } else {
        await reply(html, keyboard);
      }
    },
  };
};

/** Connects the platform to Telegram and starts long polling */
export const startTelegram = (telegram: Bot, platform: Platform) => {
  for (const command of platform.commands) {
    telegram.command(command.command, async (ctx) => {
      const chat = chatContext(platform, ctx, ctx.match);
      if (chat) {
        await platform.handleCommand(command.command, chat);
      }
    });
  }

  telegram.on('callback_query:data', async (ctx) => {
    await ctx.answerCallbackQuery();
    const chat = chatContext(platform, ctx, '');
    if (chat) {
      await platform.handleCallback(ctx.callbackQuery.data, chat);
    }
  });

  // After the commands, so that it only gets the other messages
  telegram.on('message:text', async (ctx) => {
    const chat = chatContext(platform, ctx, ctx.message.text);
    if (chat) {
      await platform.handleText(chat);
    }
  });

  telegram.catch((error) => console.error('Bot: failed to handle an update', error));

  telegram.api
    .setMyCommands(
      platform.commands.flatMap((command) =>
        command.description ? [{ command: command.command, description: command.description }] : []
      )
    )
    .catch((error) => console.error('Bot: failed to set the commands', error));

  telegram
    .start({ onStart: (info) => console.log(`Telegram bot @${info.username} started`) })
    .catch((error) => console.error('Bot: long polling stopped', error));
};
