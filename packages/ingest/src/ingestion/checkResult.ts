import { validateComboStats } from './comboScoring';
import { DiscardedResult, UnrecognizedResult } from './errors';
import { calcPhoenixScoreFromStats, validateMillionStats } from './millionScoring';
import { findPlayer } from './players';
import { getStepStats, totalSteps } from './stats';
import { findChartInstances, findTracks, type TrackMatch } from './tracks';
import type { CheckedResult, CheckOptions, ChartInstance, ResultData, ValidResult } from './types';
import type { DB } from '@pumpking/database/database';
import { findMixId, isMillionScoringMix } from '@pumpking/utils/mixes';
import { InvalidModsError } from '@pumpking/utils/mods';
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

const findResultChartInstance = async (db: Kysely<DB>, mixId: number, data: ResultData) => {
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

// The number of steps can be one off the chart's, as the legacy code allowed
const checkNumberOfSteps = (chart: ChartInstance, data: ResultData): number => {
  const steps = getStepStats(data);
  if (!steps) {
    // Only possible before Phoenix (the legacy code failed the whole request here)
    throw new UnrecognizedResult('Result with no stats');
  }
  const numberOfSteps = totalSteps(steps);
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
  return numberOfSteps;
};

/**
 * Finds the result's player and chart instance and validates its stats, in the same order
 * as the legacy `validateResult`, so a result fails with the same reason. Throws an
 * UnrecognizedResult, DiscardedResult or InvalidModsError.
 *
 * The recognized track name is always trusted to be close: the legacy stream mode, which
 * guessed the track from the label and the number of steps, isn't ported.
 */
const validateResult = async (
  db: Kysely<DB>,
  data: ResultData,
  options: CheckOptions
): Promise<ValidResult> => {
  const mixId = findMixId(data.mix_name);
  if (mixId == null) {
    throw new UnrecognizedResult(`'${data.mix_name}' is not in list`);
  }
  const player = await findPlayer(
    db,
    { id: mixId, name: data.mix_name },
    data.player_name.toUpperCase()
  );
  if (player.discard_results) {
    throw new DiscardedResult(`Player #${player.id} '${player.nickname}' results are discarded`);
  }

  if (data.screen_file && data.screen_file.length > 150) {
    throw new UnrecognizedResult(`'screen_file' is too long: ${data.screen_file}`);
  }

  // The stats of a million-scoring result say whether every judgement was recognized
  // well, before the number of steps is compared to the chart's
  const millionScoring = isMillionScoringMix(mixId);
  if (millionScoring) {
    validateMillionStats(mixId, data, options);
  }

  const chart = await findResultChartInstance(db, mixId, data);
  const steps = checkNumberOfSteps(chart, data);

  // On million-scoring mixes, rank mode comes from piu-spy, not from the mods
  const rankMode = millionScoring ? data.rank_mode : validateComboStats(chart, data);

  return {
    chart,
    steps,
    row: {
      ...data,
      score: data.score!,
      rank_mode: rankMode,
      recognized_player_id: player.id,
      mix: chart.mix,
      chart_instance: chart.id,
      shared_chart: chart.shared_chart,
      // Rounded up from the stats before Phoenix, as the legacy ingestion always did
      score_phoenix: millionScoring ? data.score : calcPhoenixScoreFromStats(data),
    },
  };
};

/** What validation decides about a result (see CheckedResult) */
export const checkResult = async (
  db: Kysely<DB>,
  data: ResultData,
  options: CheckOptions = {}
): Promise<CheckedResult> => {
  try {
    return { outcome: 'valid', ...(await validateResult(db, data, options)) };
  } catch (e) {
    if (e instanceof UnrecognizedResult || e instanceof InvalidModsError) {
      return { outcome: 'unrecognized', reason: e.message };
    }
    if (e instanceof DiscardedResult) {
      return { outcome: 'discarded', reason: e.message };
    }
    throw e;
  }
};
