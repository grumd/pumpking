import { getPlayerLatestResults } from 'services/players/playerLatestResults';
import { publicProcedure } from 'trpc/trpc';
import z from 'zod';

export const latestResults = publicProcedure
  .input(
    z.object({
      playerId: z.number().optional(),
      cursor: z.number().nullish(),
      pageSize: z.number(),
    })
  )
  .query(async ({ ctx, input }) => {
    const { cursor, pageSize = 20, playerId } = input;
    const offset = cursor ?? 0;
    return {
      items: await getPlayerLatestResults({
        playerId: playerId ?? ctx.user?.id,
        limit: pageSize,
        offset,
      }),
      nextCursor: offset + pageSize,
    };
  });
