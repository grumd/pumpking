import z from 'zod';
import { publicProcedure } from 'trpc/trpc';

import { getPlayers } from 'services/players/players';

export const list = publicProcedure
  .input(
    z.object({
      mixId: z.number().optional(),
    })
  )
  .query(async ({ ctx, input }) => {
    return getPlayers(input);
  });
