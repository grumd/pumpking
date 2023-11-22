import z from 'zod';
import { publicProcedure } from 'trpc/trpc';

import { searchCharts } from 'services/charts/chartsSearch';

export const search = publicProcedure
  .input(
    z.object({
      scoring: z.enum(['xx', 'phoenix']).optional(),
      duration: z.enum(['Full', 'Remix', 'Short', 'Standard']).optional(),
      minLevel: z.number().optional(),
      maxLevel: z.number().optional(),
      label: z.string().optional(),
      mixes: z.array(z.number()).optional(),
      songName: z.string().optional(),
      playersSome: z.array(z.number()).optional(),
      playersNone: z.array(z.number()).optional(),
      playersAll: z.array(z.number()).optional(),
      sortChartsBy: z.enum(['date', 'difficulty', 'pp']).optional(),
      sortChartsDir: z.enum(['asc', 'desc']).optional(),
      sortChartsByPlayers: z.array(z.number()).optional(),
      cursor: z.number().nullish(),
      pageSize: z.number(),
    })
  )
  .query(async ({ ctx, input }) => {
    const { cursor, pageSize, ...rest } = input;
    const offset = cursor ?? 0;
    return {
      items: await searchCharts({
        ...rest,
        limit: pageSize,
        offset,
        currentPlayerId: ctx.user?.id,
      }),
      nextCursor: offset + pageSize,
    };
  });
