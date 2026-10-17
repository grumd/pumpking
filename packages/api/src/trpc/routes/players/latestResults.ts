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
    const { cursor, pageSize, playerId } = input;
    const offset = cursor ?? 0;
    const items = await getPlayerLatestResults({
      playerId: playerId ?? ctx.user?.id,
      limit: pageSize,
      offset,
    });
    return {
      items,
      // A short page is the last one
      nextCursor: items.length < pageSize ? null : offset + pageSize,
    };
  });
