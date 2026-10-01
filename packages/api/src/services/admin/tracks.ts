import {
  type ArcadeNames,
  getTrackArcadeNames,
  normalizeArcadeNames,
  saveArcadeNames,
} from './arcadeNames';
import { describeChanges } from './report';
import { db } from '@pumpking/database/db';
import { error } from 'utils';

export const listTracks = async () => {
  const [tracks, arcadeNames] = await Promise.all([
    db
      .selectFrom('tracks')
      .select(['id', 'external_id', 'full_name', 'short_name', 'duration'])
      .orderBy('id')
      .execute(),
    getTrackArcadeNames(),
  ]);
  return tracks.map((track) => ({ ...track, arcadeNames: arcadeNames(track.id) }));
};

// A track with its arcade names and its charts, each with its instances per mix
export const getTrack = async (trackId: number) => {
  const track = await db
    .selectFrom('tracks')
    .select(['id', 'external_id', 'full_name', 'short_name', 'duration'])
    .where('id', '=', trackId)
    .executeTakeFirst();
  if (!track) {
    throw error(404, `Track not found: id ${trackId}`);
  }

  const [sharedCharts, chartInstances, arcadeNames] = await Promise.all([
    db
      .selectFrom('shared_charts')
      .select(['id', 'index_in_track', 'type'])
      .where('track', '=', trackId)
      .orderBy('index_in_track')
      .execute(),
    db
      .selectFrom('chart_instances')
      .select(['id', 'shared_chart', 'mix', 'label', 'level', 'min_total_steps', 'max_total_steps'])
      .where('track', '=', trackId)
      .orderBy('mix')
      .execute(),
    getTrackArcadeNames([trackId]),
  ]);

  return {
    ...track,
    arcadeNames: arcadeNames(trackId),
    charts: sharedCharts.map((sharedChart) => ({
      ...sharedChart,
      instances: chartInstances.filter((instance) => instance.shared_chart === sharedChart.id),
    })),
  };
};

// The track of a chart instance, for looking a chart up by its id
export const findChartInstanceTrack = async (chartInstanceId: number) => {
  const chartInstance = await db
    .selectFrom('chart_instances')
    .select(['id', 'track'])
    .where('id', '=', chartInstanceId)
    .executeTakeFirst();
  if (!chartInstance) {
    throw error(404, `Chart instance not found: id ${chartInstanceId}`);
  }
  return { trackId: chartInstance.track };
};

export const saveTrackArcadeNames = async (trackId: number, arcadeNames: ArcadeNames) => {
  const track = await getTrack(trackId);
  const report = await db
    .transaction()
    .execute((trx) =>
      saveArcadeNames(
        trx,
        'track',
        trackId,
        track.arcadeNames,
        normalizeArcadeNames(arcadeNames, { upperCase: false })
      )
    );
  return { report: report.length ? report : [`Track #${trackId}: nothing changed`] };
};

/**
 * Sets the range of step counts (the sum of perfects to misses) a chart instance accepts.
 * Ingestion learns it from complete results and rejects results outside it (± 1)
 */
export const updateChartInstanceSteps = async (
  chartInstanceId: number,
  steps: { minTotalSteps: number | null; maxTotalSteps: number | null }
) => {
  const chartInstance = await db
    .selectFrom('chart_instances')
    .select(['id', 'min_total_steps', 'max_total_steps'])
    .where('id', '=', chartInstanceId)
    .executeTakeFirst();
  if (!chartInstance) {
    throw error(404, `Chart instance not found: id ${chartInstanceId}`);
  }
  if (
    steps.minTotalSteps != null &&
    steps.maxTotalSteps != null &&
    steps.minTotalSteps > steps.maxTotalSteps
  ) {
    throw error(400, 'Min total steps is higher than max total steps');
  }

  const changes = { min_total_steps: steps.minTotalSteps, max_total_steps: steps.maxTotalSteps };
  await db.updateTable('chart_instances').set(changes).where('id', '=', chartInstanceId).execute();

  const report = describeChanges(`Chart #${chartInstanceId}`, chartInstance, changes);
  return { report: report.length ? report : [`Chart #${chartInstanceId}: nothing changed`] };
};
