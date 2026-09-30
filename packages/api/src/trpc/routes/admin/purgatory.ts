import {
  deletePurgatoryRow,
  getPurgatoryRow,
  listPurgatory,
  recheckPurgatory,
  updateAndRecheckPurgatoryRow,
} from 'services/admin/purgatory';
import { adminProcedure, router } from 'trpc/trpc';
import { z } from 'zod';

const count = z.number().int().min(0).nullable();

const purgatoryEdit = z
  .object({
    track_name: z.string().max(100),
    chart_label: z.string().max(10),
    player_name: z.string().max(20),
    mods_list: z.string().max(40).nullable(),
    score: count,
    score_increase: count,
    grade: z.string().max(5).nullable(),
    is_pass: z.number().int().min(0).max(1).nullable(),
    plate: z.string().max(5).nullable(),
    perfects: count,
    greats: count,
    goods: count,
    bads: count,
    misses: count,
    max_combo: count,
    calories: count,
  })
  .partial();

export const purgatory = router({
  list: adminProcedure.query(() => listPurgatory()),
  get: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getPurgatoryRow(input.id)),
  // Saves the fixes, then rechecks the row
  updateAndRecheck: adminProcedure
    .input(z.object({ id: z.number(), edit: purgatoryEdit }))
    .mutation(({ input }) => updateAndRecheckPurgatoryRow(input.id, input.edit)),
  // One row, or all of them without an id
  recheck: adminProcedure
    .input(z.object({ id: z.number().optional() }))
    .mutation(({ input }) => recheckPurgatory(input.id)),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deletePurgatoryRow(input.id)),
});
