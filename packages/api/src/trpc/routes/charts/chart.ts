import { searchCharts } from 'services/charts/chartsSearch';
import { publicProcedure } from 'trpc/trpc';
import z from 'zod';

export const chart = publicProcedure
  .input(
    z.object({
      scoring: z.enum(['xx', 'phoenix']).optional(),
      sharedChartId: z.number(),
    })
  )
  .query(async ({ ctx, input }) => {
    return {
      items: await searchCharts({
        ...input,
        currentPlayerId: ctx.user?.id,
      }),
    };
  });
