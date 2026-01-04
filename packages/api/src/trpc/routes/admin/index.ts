import { adminProcedure, router } from 'trpc/trpc';
import { z } from 'zod';
import { db } from 'db';
import { deleteResult } from 'services/results/deleteResult';
import { error } from 'utils';

export const getPlayerAdminInfo = adminProcedure
  .input(z.object({ playerId: z.number() }))
  .query(async ({ input }) => {
    const player = await db
      .selectFrom('players')
      .select([
        'id',
        'nickname',
        'can_add_results_manually',
        'region',
        'telegram_tag',
        'telegram_id',
        'hidden',
      ])
      .where('id', '=', input.playerId)
      .executeTakeFirst();

    if (!player) {
      return null;
    }

    return {
      id: player.id,
      nickname: player.nickname,
      canAddResultsManually: !!player.can_add_results_manually,
      region: player.region,
      telegramTag: player.telegram_tag,
      telegramId: player.telegram_id,
      hidden: !!player.hidden,
    };
  });

export const deleteResultMutation = adminProcedure
  .input(z.object({ resultId: z.number() }))
  .mutation(async ({ input }) => {
    await deleteResult(input.resultId);
    return { success: true };
  });

export const updatePlayerMutation = adminProcedure
  .input(
    z.object({
      playerId: z.number(),
      canAddResultsManually: z.boolean().optional(),
      region: z.string().nullable().optional(),
      telegramTag: z.string().nullable().optional(),
      telegramId: z.number().nullable().optional(),
      hidden: z.boolean().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { playerId, ...fields } = input;

    const player = await db
      .selectFrom('players')
      .select(['id'])
      .where('id', '=', playerId)
      .executeTakeFirst();

    if (!player) {
      throw error(404, `Player not found: id ${playerId}`);
    }

    const updates: Record<string, unknown> = {};

    if (fields.canAddResultsManually !== undefined) {
      updates.can_add_results_manually = fields.canAddResultsManually ? 1 : 0;
    }
    if (fields.region !== undefined) {
      updates.region = fields.region;
    }
    if (fields.telegramTag !== undefined) {
      updates.telegram_tag = fields.telegramTag;
    }
    if (fields.telegramId !== undefined) {
      updates.telegram_id = fields.telegramId;
    }
    if (fields.hidden !== undefined) {
      updates.hidden = fields.hidden ? 1 : 0;
    }

    if (Object.keys(updates).length > 0) {
      await db
        .updateTable('players')
        .set(updates)
        .where('id', '=', playerId)
        .executeTakeFirst();
    }

    return { playerId, ...fields };
  });

export const admin = router({
  getPlayerAdminInfo,
  deleteResult: deleteResultMutation,
  updatePlayer: updatePlayerMutation,
});
