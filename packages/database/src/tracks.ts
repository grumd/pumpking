import type { DB } from './database';
import { distance } from 'fastest-levenshtein';
import type { Kysely } from 'kysely';

/**
 * Finding a track and chart by the names the arcade shows, used by ingest for piu-spy's
 * results and by the API for results read from photos.
 */

// Applied in this order, so that minor visual differences in recognized track names
// don't count (legacy `tracklist.charNormalization`)
const CHAR_NORMALIZATION: [string, string][] = [
  ['{', '('],
  ['}', ')'],
  ['[', '('],
  [']', ')'],
  ['–', '-'],
  ['~', '-'],
  ['`', "'"],
  ['’', "'"],
  ['‘', "'"],
  ['°', "'"],
  ["'", ''],
  ['“', '"'],
  ['”', '"'],
  ['¢', 'c'],
  ['0', 'o'],
  ['|', 'l'],
  ['i', 'l'],
  ['.', ''],
  [',', ''],
  [' ', ''],
];

export const normalizeTrackName = (name: string) => {
  let result = name.toLowerCase();
  for (const [from, to] of CHAR_NORMALIZATION) {
    result = result.replaceAll(from, to);
  }
  return result;
};

export interface TrackMatch {
  track: number;
  external_id: string;
  editDistance: number;
}

export interface FindTracksOptions {
  // The edit distance allowed, as a share of the arcade name's normalized length. Without
  // it, each name's own `arcade_track_names.name_edist` is used
  relativeTolerance?: number;
}

/**
 * Tracks whose arcade name on the mix matches the recognized one: those at the smallest
 * edit distance, if within their name's tolerance. Without a match, `almostTracks` are the
 * best guesses for the purgatory reason
 */
export const findTracks = async (
  db: Kysely<DB>,
  mixId: number,
  name: string,
  { relativeTolerance }: FindTracksOptions = {}
) => {
  const rows = await db
    .selectFrom('arcade_track_names as atn')
    .innerJoin('tracks', 'tracks.id', 'atn.track_id')
    .select(['atn.track_id as track', 'atn.name', 'atn.name_edist', 'tracks.external_id'])
    .where('atn.mix_id', '=', mixId)
    .orderBy('atn.track_id')
    .execute();
  if (rows.length === 0) {
    return { tracks: [], almostTracks: [] };
  }

  const normalizedName = normalizeTrackName(name);
  const candidates = rows
    .map((row) => {
      const normalizedRowName = normalizeTrackName(row.name);
      return {
        ...row,
        tolerance:
          relativeTolerance == null
            ? row.name_edist
            : Math.floor(normalizedRowName.length * relativeTolerance),
        editDistance: distance(normalizedName, normalizedRowName),
      };
    })
    .sort((a, b) => a.editDistance - b.editDistance);
  const smallest = candidates[0].editDistance;

  const tracks = candidates.filter(
    (track) => track.editDistance === smallest && track.editDistance <= track.tolerance
  );
  if (tracks.length > 0) {
    return { tracks, almostTracks: [] };
  }
  let almostTracks = candidates.filter(
    (track) => track.editDistance > smallest && track.editDistance <= track.tolerance
  );
  if (almostTracks.length === 0) {
    almostTracks = candidates.filter((track) => track.editDistance <= track.tolerance + 1);
  }
  return { tracks: [], almostTracks };
};

// A chart instance that a result was matched to
export interface ChartInstance {
  id: number;
  shared_chart: number;
  mix: number;
  label: string;
  level: number | null;
  min_total_steps: number | null;
  max_total_steps: number | null;
  // tracks.duration
  duration: string | null;
}

// The chart instances with this label on the mix, on any of the tracks
export const findChartInstances = async (
  db: Kysely<DB>,
  trackIds: number[],
  mixId: number,
  label: string
): Promise<ChartInstance[]> => {
  return db
    .selectFrom('chart_instances')
    .innerJoin('shared_charts', 'shared_charts.id', 'chart_instances.shared_chart')
    .innerJoin('tracks', 'tracks.id', 'shared_charts.track')
    .select([
      'chart_instances.id',
      'chart_instances.shared_chart',
      'chart_instances.mix',
      'chart_instances.label',
      'chart_instances.level',
      'chart_instances.min_total_steps',
      'chart_instances.max_total_steps',
      'tracks.duration',
    ])
    .where('chart_instances.label', '=', label)
    .where('chart_instances.mix', '=', mixId)
    .where('tracks.id', 'in', trackIds)
    .orderBy('chart_instances.id')
    .execute();
};
