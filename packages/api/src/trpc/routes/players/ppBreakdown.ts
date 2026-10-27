import { getPlayerPpBreakdown } from 'services/players/playerPpBreakdown';
import { publicProcedure } from 'trpc/trpc';
import z from 'zod';

export const ppBreakdown = publicProcedure
  .input(
    z.object({
      playerId: z.number().optional(),
      cursor: z.number().nullish(),
      pageSize: z.number(),
    })
  )
  .query(async ({ ctx, input }) => {
    const { cursor, pageSize, playerId } = input;
    const offset = cursor ?? 0;
    const { items, total, totalPp } = await getPlayerPpBreakdown({
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
