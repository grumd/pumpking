import { wrap } from '../platform/texts';
import type { ChatContext, Plugin } from '../platform/types';
import { db } from '@pumpking/database/db';

// Links a Telegram chat to a player: the player's `telegram_tag` (set on the site) has to
// be the Telegram username. Ported from the legacy bot's RegisterPlayer and the backend's
// LinkUser (C3)

export type LinkResult = { nickname: string; isNew: boolean } | { error: string };

export const linkPlayer = async (
  telegramTag: string | undefined,
  telegramId: number
): Promise<LinkResult> => {
  const player = telegramTag
    ? await db
        .selectFrom('players')
        .select(['id', 'nickname', 'telegram_id'])
        .where('telegram_tag', '=', telegramTag)
        .executeTakeFirst()
    : undefined;
  if (!player) {
    return { error: `Player with tag ${telegramTag} was not found` };
  }

  if (player.telegram_id == null) {
    await db
      .updateTable('players')
      .set({ telegram_id: telegramId })
      .where('id', '=', player.id)
      .execute();
    return { nickname: player.nickname, isNew: true };
  }
  if (player.telegram_id !== telegramId) {
    return { error: `Player with tag ${telegramTag} doesnt' match id ${telegramId}` };
  }
  return { nickname: player.nickname, isNew: false };
};

const register = async (ctx: ChatContext) => {
  const result = await linkPlayer(ctx.username, ctx.chatId);

  if ('error' in result) {
    await ctx.reply(
      `Error occured on player link: ${wrap(result.error)}\nPlease report @${
        ctx.bot.config.adminNickname
      }`
    );
    console.warn(`Bot: error linking ${ctx.username}: ${result.error}`);
    return;
  }

  const nickname = wrap(result.nickname);
  if (result.isNew) {
    await ctx.reply(
      `Oh! You're that <b>${nickname}</b>, now I know you!\n\n` +
        `You may probably want to set your <b>rivals</b>?`
    );
  } else {
    await ctx.reply(
      `Greetings! Glad to see you again, <b>${nickname}</b>\n\n` +
        `You may probably want to set your <b>rivals</b>?`
    );
  }
};

export const accountPlugin: Plugin = {
  name: 'account',
  commands: [
    {
      command: 'register',
      description: 'Register in bot',
      aliases: ['hi', 'hello'],
      handle: register,
    },
  ],
};
