import { getPlayerAwards, getTournament, listTournaments } from 'services/tournaments/tournament';
import { publicProcedure, router } from 'trpc/trpc';
import { z } from 'zod';

export const tournaments = router({
  list: publicProcedure.query(() => listTournaments()),
  get: publicProcedure
    .input(z.object({ tournamentId: z.number().optional() }))
    .query(({ ctx, input }) =>
      getTournament({ tournamentId: input.tournamentId, playerId: ctx.user?.id })
    ),
  awards: publicProcedure
    .input(z.object({ playerId: z.number() }))
    .query(({ input }) => getPlayerAwards(input.playerId)),
});
