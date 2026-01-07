import { addResult } from 'services/results/addResult';
import { publicProcedure } from 'trpc/trpc';
import { base64 } from 'utils/zod';
import { z } from 'zod';

export const addResultMutation = publicProcedure
  .input(
    z.object({
      screenshot: base64,
      fileName: z.string(),
      playerId: z.number(),
      grade: z.string(),
      mix: z.enum(['Phoenix', 'XX', 'Prime2', 'Prime']),
      mod: z.enum(['VJ', 'HJ', '']),
      score: z.number(),
      perfect: z.number(),
      great: z.number(),
      good: z.number(),
      bad: z.number(),
      miss: z.number(),
      combo: z.number(),
      date: z.coerce.date(),
      isExactDate: z.boolean(),
      sharedChartId: z.number(),
      pass: z.boolean(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new Error('Not logged in');
    }
    await addResult(ctx.user.id, {
      ...input,
      screenshotTempPath: input.screenshot.filePath,
    });
    await input.screenshot.dispose();
  });
