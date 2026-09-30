import type { DB } from '../database';
import { validateComboStats } from './comboScoring';
import { DiscardedResult, UnrecognizedResult } from './errors';
import { validateMillionStats } from './millionScoring';
import { findMixId, mixNameHasMillionScoring } from './mixes';
import { findPlayer } from './players';
import { getNumberOfSteps } from './stats';
import { findChartInstances, findTracks, type TrackMatch } from './tracks';
import type { ChartInstance, ResultData } from './types';
import type { Kysely } from 'kysely';

// UCS (user-created) charts
const UCS_LABELS = ['S', 'D', 'SP', 'DP', 'S!!', 'D!!'];

const describeTracks = (tracks: TrackMatch[], withEditDistance = false) =>
  tracks
    .map(
      (track) =>
        `#${track.track} (${track.external_id})${
          withEditDistance ? ` ed-${track.editDistance}` : ''
        }`
    )
    .join(' / ');

const findResultChartInstance = async (db: Kysely<DB>, data: ResultData) => {
  const mixId = findMixId(data.mix_name);
  if (mixId == null) {
    throw new UnrecognizedResult('Invalid mix');
  }
  if (data.track_name.startsWith('RANDOM TRAIN')) {
    throw new DiscardedResult('Random train results are not handled');
  }
  if (UCS_LABELS.includes(data.chart_label)) {
    throw new DiscardedResult('UCS results are not handled');
  }

  const { tracks, almostTracks } = await findTracks(db, mixId, data.track_name);
  if (tracks.length === 0) {
    throw new UnrecognizedResult(
      almostTracks.length > 0
        ? `Invalid track name '${data.track_name}', best guess is ${describeTracks(
            almostTracks,
            true
          )}`
        : `Invalid track name '${data.track_name}', no best guess`
    );
  }

  const charts = await findChartInstances(
    db,
    tracks.map((track) => track.track),
    mixId,
    data.chart_label
  );
  if (charts.length === 0) {
    throw new UnrecognizedResult(
      `Invalid chart '${data.chart_label}' in mix ${data.mix_name} on track(s) ${describeTracks(
        tracks
      )}`
    );
  }
  if (charts.length > 1) {
    throw new UnrecognizedResult(
      `Ambiguous chart '${data.chart_label}' in mix ${data.mix_name} on track(s) ${describeTracks(
        tracks
      )}`
    );
  }
  return charts[0];
};

/**
 * Finds the result's player and chart instance and validates its stats (the legacy
 * `validateResult`), in the same order as the legacy code, so a result fails with the
 * same reason. Throws an UnrecognizedResult or a DiscardedResult; on success sets
 * `recognized_player_id`, `mix`, `chart_instance`, `shared_chart` on the result and
 * returns its chart instance.
 *
 * The recognized track name is always trusted to be close: the legacy stream mode, which
 * guessed the track from the label and the number of steps, isn't ported.
 */
export const validateResult = async (db: Kysely<DB>, data: ResultData): Promise<ChartInstance> => {
  const player = await findPlayer(db, data.mix_name, data.player_name.toUpperCase());
  if (player.discard_results) {
    throw new DiscardedResult(`Player #${player.id} '${player.nickname}' results are discarded`);
  }

  if (data.screen_file && data.screen_file.length > 150) {
    throw new UnrecognizedResult(`'screen_file' is too long: ${data.screen_file}`);
  }

  // The stats of a million-scoring result say whether every judgement was recognized
  // well, before the number of steps is compared to the chart's
  const millionScoring = mixNameHasMillionScoring(data.mix_name);
  if (millionScoring) {
    validateMillionStats(data);
  }

  const chart = await findResultChartInstance(db, data);

  const numberOfSteps = getNumberOfSteps(data);
  if (numberOfSteps == null) {
    // Only possible before Phoenix (the legacy code failed the whole request here)
    throw new UnrecognizedResult('Result with no stats');
  }
  if (chart.max_total_steps != null && numberOfSteps > chart.max_total_steps + 1) {
    throw new UnrecognizedResult(
      `Number of steps ${numberOfSteps} is higher than chart #${chart.id} max ${chart.max_total_steps} steps`
    );
  }
  if (chart.min_total_steps != null && numberOfSteps < chart.min_total_steps - 1) {
    throw new UnrecognizedResult(
      `Number of steps ${numberOfSteps} is lesser than chart #${chart.id} min ${chart.min_total_steps} steps`
    );
  }

  if (!millionScoring) {
    validateComboStats(chart, data);
  }

  data.recognized_player_id = player.id;
  data.mix = chart.mix;
  data.chart_instance = chart.id;
  data.shared_chart = chart.shared_chart;
  return chart;
};
