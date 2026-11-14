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

export const getTrack = async (trackId: number) => {
  const track = await db
    .selectFrom('tracks')
    .select(['id', 'external_id', 'full_name', 'short_name', 'duration'])
    .where('id', '=', trackId)
    .executeTakeFirst();
  if (!track) {
    throw error(404, `Track not found: id ${trackId}`);
  }

  const [sharedCharts, chartInstances, resultCounts, arcadeNames] = await Promise.all([
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
    db
      .selectFrom('results')
      .select(({ fn }) => ['chart_instance', fn.countAll<number>().as('count')])
      .where('chart_instance', 'in', (eb) =>
        eb.selectFrom('chart_instances').select('id').where('track', '=', trackId)
      )
      .groupBy('chart_instance')
      .execute(),
    getTrackArcadeNames([trackId]),
  ]);
  const resultsCount = new Map(resultCounts.map((row) => [row.chart_instance, Number(row.count)]));

  return {
    ...track,
    arcadeNames: arcadeNames(trackId),
    charts: sharedCharts.map((sharedChart) => ({
      ...sharedChart,
      instances: chartInstances
        .filter((instance) => instance.shared_chart === sharedChart.id)
        .map((instance) => ({ ...instance, resultsCount: resultsCount.get(instance.id) ?? 0 })),
    })),
  };
};

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

const CHART_RESULTS_FIRST_PAGE = 200;
const CHART_RESULTS_PAGE = 500;

export const getChartInstanceResults = async (chartInstanceId: number, cursor?: number | null) => {
  const limit = cursor ? CHART_RESULTS_PAGE : CHART_RESULTS_FIRST_PAGE;
  const chartInstance = await db
    .selectFrom('chart_instances')
    .select('id')
    .where('id', '=', chartInstanceId)
    .executeTakeFirst();
  if (!chartInstance) {
    throw error(404, `Chart instance not found: id ${chartInstanceId}`);
  }

  const rows = await db
    .selectFrom('results')
    .leftJoin('players', 'players.id', 'results.player_id')
    .leftJoin('agents', 'agents.id', 'results.agent')
    .select([
      'results.id',
      'results.gained',
      'results.player_id',
      'players.nickname',
      'results.score',
      'results.grade',
      'results.plate',
      'results.perfects',
      'results.greats',
      'results.goods',
      'results.bads',
      'results.misses',
      'results.agent',
      'agents.name as agent_name',
      'results.is_hidden',
    ])
    .where('results.chart_instance', '=', chartInstanceId)
    .$if(!!cursor, (query) => query.where('results.id', '<', cursor ?? 0))
    .orderBy('results.id', 'desc')
    .limit(limit)
    .execute();
  return { rows, nextCursor: rows.length === limit ? rows[rows.length - 1].id : null };
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
