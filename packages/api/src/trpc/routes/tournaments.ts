import { TRPCError } from '@trpc/server';
import {
  getPlayerAwards,
  getTournament,
  joinBracket,
  listTournaments,
} from 'services/tournaments/tournament';
import { publicProcedure, router } from 'trpc/trpc';
import { z } from 'zod';

export const tournaments = router({
  list: publicProcedure.query(() => listTournaments()),
  get: publicProcedure
    .input(z.object({ tournamentId: z.number().optional() }))
    .query(({ ctx, input }) =>
      getTournament({ tournamentId: input.tournamentId, playerId: ctx.user?.id })
    ),
  join: publicProcedure.input(z.object({ bracketId: z.number() })).mutation(({ ctx, input }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not logged in' });
    }
    return joinBracket({ playerId: ctx.user.id, bracketId: input.bracketId });
  }),
  awards: publicProcedure
    .input(z.object({ playerId: z.number() }))
    .query(({ input }) => getPlayerAwards(input.playerId)),
});
