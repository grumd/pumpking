import { getPlayerMostPlayedCharts } from 'services/players/playerMostPlayedCharts';
import { publicProcedure } from 'trpc/trpc';
import z from 'zod';

export const mostPlayed = publicProcedure
  .input(
    z.object({
      playerId: z.number().optional(),
      cursor: z.number(),
      pageSize: z.number(),
    })
  )
  .query(async ({ ctx, input }) => {
    const { cursor, pageSize = 10, playerId } = input;
    const offset = cursor ?? 0;
    return {
      items: await getPlayerMostPlayedCharts({
        playerId: playerId ?? ctx.user?.id,
        limit: pageSize,
        offset,
      }),
      nextCursor: offset + pageSize,
    };
  });
