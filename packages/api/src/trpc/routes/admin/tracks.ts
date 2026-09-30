import { arcadeNames } from './arcadeNames';
import {
  applyTracklistSync,
  previewTracklistSync,
  tracklistFileSchema,
} from 'services/admin/tracklistSync';
import {
  findChartInstanceTrack,
  getTrack,
  listTracks,
  saveTrackArcadeNames,
  updateChartInstanceSteps,
} from 'services/admin/tracks';
import { adminProcedure, router } from 'trpc/trpc';
import { z } from 'zod';

const steps = z.number().int().positive().nullable();

export const tracks = router({
  list: adminProcedure.query(() => listTracks()),
  get: adminProcedure.input(z.object({ id: z.number() })).query(({ input }) => getTrack(input.id)),
  byChartInstance: adminProcedure
    .input(z.object({ chartInstanceId: z.number() }))
    .query(({ input }) => findChartInstanceTrack(input.chartInstanceId)),
  saveArcadeNames: adminProcedure
    .input(z.object({ id: z.number(), arcadeNames: arcadeNames(100) }))
    .mutation(({ input }) => saveTrackArcadeNames(input.id, input.arcadeNames)),
  updateChartSteps: adminProcedure
    .input(z.object({ chartInstanceId: z.number(), minTotalSteps: steps, maxTotalSteps: steps }))
    .mutation(({ input }) => updateChartInstanceSteps(input.chartInstanceId, input)),
  // Tracklist sync: a preview of the changes a tracklist file makes, then applying them
  previewSync: adminProcedure
    .input(z.object({ file: tracklistFileSchema }))
    .mutation(({ input }) => previewTracklistSync(input.file)),
  applySync: adminProcedure
    .input(z.object({ file: tracklistFileSchema }))
    .mutation(({ input }) => applyTracklistSync(input.file)),
});
