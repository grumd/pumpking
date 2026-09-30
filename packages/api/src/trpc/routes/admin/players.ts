import { arcadeNames } from './arcadeNames';
import { getPlayer, listPlayers, savePlayer } from 'services/admin/players';
import { adminProcedure, router } from 'trpc/trpc';
import { z } from 'zod';

const playerFields = z.object({
  nickname: z.string().trim().min(1).max(20),
  email: z.string().trim().max(100).nullable(),
  region: z.string().length(2).nullable(),
  telegramTag: z.string().trim().max(45).nullable(),
  telegramId: z.number().int().nullable(),
  hidden: z.boolean(),
  discardResults: z.boolean(),
  isAdmin: z.boolean(),
  canAddResultsManually: z.boolean(),
  actualPlayerId: z.number().int().positive().nullable(),
  arcadeNames: arcadeNames(20),
});

export const players = router({
  list: adminProcedure.query(() => listPlayers()),
  get: adminProcedure.input(z.object({ id: z.number() })).query(({ input }) => getPlayer(input.id)),
  // Creates a player without an id
  save: adminProcedure
    .input(z.object({ id: z.number().nullable(), fields: playerFields }))
    .mutation(({ input }) => savePlayer(input.id, input.fields)),
});
