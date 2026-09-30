import { getResult, removeResult, searchResults, updateResult } from 'services/admin/results';
import { adminProcedure, router } from 'trpc/trpc';
import { z } from 'zod';

const count = z.number().int().min(0).nullable();

export const results = router({
  search: adminProcedure
    .input(
      z.object({
        resultId: z.number().int().positive().optional(),
        score: z.number().int().positive().optional(),
        playerId: z.number().int().positive().optional(),
        track: z.string().trim().min(1).optional(),
        chartLabel: z.string().trim().min(1).optional(),
      })
    )
    .query(({ input }) => searchResults(input)),
  get: adminProcedure.input(z.object({ id: z.number() })).query(({ input }) => getResult(input.id)),
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        edit: z
          .object({
            score: count,
            scoreIncrease: count,
            grade: z.string().max(5).nullable(),
            plate: z.string().max(5).nullable(),
            isPass: z.boolean().nullable(),
            perfects: count,
            greats: count,
            goods: count,
            bads: count,
            misses: count,
            maxCombo: count,
            calories: count,
            modsList: z.string().max(40).nullable(),
            actualPlayerId: z.number().int().positive().nullable(),
            isHidden: z.boolean(),
            notes: z.string().max(512).nullable(),
          })
          .partial(),
      })
    )
    .mutation(({ input }) => updateResult(input.id, input.edit)),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => removeResult(input.id)),
});
