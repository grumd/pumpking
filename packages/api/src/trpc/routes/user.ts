import { updatePreferences } from 'services/users/preferences';
import { publicProcedure, router } from 'trpc/trpc';
import { z } from 'zod';

export const current = publicProcedure.query(async ({ ctx }) => {
  return ctx.user || null;
});

export const preferencesMutation = publicProcedure
  .input(
    z.object({
      showHiddenPlayersInRanking: z.boolean().optional(),
      playersHiddenStatus: z.record(z.boolean()).optional(),
      hiddenRegions: z.record(z.boolean()).optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new Error('Not logged in');
    }

    const newUser = await updatePreferences(ctx.user.id, input);
    return newUser;
  });

export const user = router({
  current,
  preferencesMutation,
});
