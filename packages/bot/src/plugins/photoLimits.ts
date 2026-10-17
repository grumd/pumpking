import { wrap } from '../platform/texts';
import type { Plugin } from '../platform/types';
import { db } from '@pumpking/database/db';

// Tells the admins when a player goes over a cost limit of reading result photos
// (docs/photo-results/PLAN.md, "Cost limits"): the site's admins with a linked Telegram,
// and the bot's admin chat

const PROFILE_URL = 'https://pumpking.top/#/profiles/';

const LIMIT_TEXTS = {
  unproductive: 'too many photos without a result in 24 hours',
  total: 'the spend ceiling of 3 days',
};

// "2026-10-18T14:05:00.000Z" -> "2026-10-18 14:05 UTC"
const formatUtc = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;

export const photoLimitsPlugin: Plugin = {
  name: 'photoLimits',
  events: {
    photoLimitReached: async ({ playerId, limit, retryAt }, bot) => {
      const player = await db
        .selectFrom('players')
        .select('nickname')
        .where('id', '=', playerId)
        .executeTakeFirst();
      const admins = await db
        .selectFrom('players')
        .select('telegram_id')
        .where('is_admin', '=', 1)
        .where('telegram_id', 'is not', null)
        .execute();
      const chatIds = new Set(admins.map((admin) => Number(admin.telegram_id)));
      if (bot.config.adminId) {
        chatIds.add(bot.config.adminId);
      }

      const html =
        `⚠️  <b>${wrap(player?.nickname ?? `#${playerId}`)}</b> reached a photo reading limit: ` +
        `${LIMIT_TEXTS[limit]}. They can upload again after ${formatUtc(retryAt)}.\n` +
        `${PROFILE_URL}${playerId}`;
      for (const chatId of chatIds) {
        await bot.sender.send(chatId, html);
      }
    },
  },
};
