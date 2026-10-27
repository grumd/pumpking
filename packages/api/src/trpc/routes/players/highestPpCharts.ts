import { getPlayerHighestPpCharts } from 'services/players/playerHighestPpCharts';
import { publicProcedure } from 'trpc/trpc';
import z from 'zod';

export const highestPpCharts = publicProcedure
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
    const { items, total, totalPp } = await getPlayerHighestPpCharts({
      playerId: playerId ?? ctx.user?.id,
      limit: pageSize,
      offset,
    });
    return {
      items,
      totalPp,
      nextCursor: offset + pageSize < total ? offset + pageSize : null,
    };
  });
