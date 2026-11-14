import { getChart } from 'services/charts/chartsSearch';
import { publicProcedure } from 'trpc/trpc';
import z from 'zod';

export const chart = publicProcedure
  .input(
    z.object({
      sharedChartId: z.number(),
    })
  )
  .query(async ({ ctx, input }) => {
    return getChart({ ...input, currentPlayerId: ctx.user?.id });
  });
