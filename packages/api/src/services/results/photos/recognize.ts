import {
  checkRead,
  decide,
  NUMBER_FIELDS,
  passes,
  type ChartCandidate,
  type Field,
  type PhotoValues,
} from './decide';
import { addPhotoRead, getPhotoLimitReached, type PhotoLimitKind } from './limits';
import {
  readPhoto as defaultReadPhoto,
  READER_A,
  READER_B,
  READER_C,
  type PhotoImage,
  type PhotoMix,
  type PhotoRead,
  type ReadPhoto,
  type Reader,
} from './reader';
import { db } from '@pumpking/database/db';
import { findChartInstances, findTracks } from '@pumpking/database/tracks';
import { isMillionScoringMix, MIXES } from '@pumpking/utils/mixes';
import createDebug from 'debug';
import { sql } from 'kysely';
import {
  addResult,
  findPhotoResult,
  findSamePlay,
  rememberDuplicatePhoto,
} from 'services/results/addResult';
import { StatusError } from 'utils/errors';

/**
 * A result from a photo of its screen: read, checked against the database, and saved when
 * nothing is in doubt (docs/photo-results/PLAN.md). Nothing is kept while a photo waits
 * for the user: the web holds the photo and the reads, and adds the result itself
 */

const debug = createDebug('backend-ts:service:photos:recognize');

// The edit distance allowed between the read song title and the arcade name
const TITLE_TOLERANCE = 0.25;

export interface PhotoInput {
  playerId: number;
  isAdmin: boolean;
  // Off for a single photo: it is read and checked, then the user confirms it
  autoSave: boolean;
  mix: PhotoMix;
  // The photo sent to the readers (2048px), and the copy that is stored with the result
  image: PhotoImage;
  screenshotPath: string;
  // SHA-256 of the original file
  hash: string;
  date: Date;
  isExactDate: boolean;
}

export interface PhotoChart {
  sharedChartId: number;
  songName: string;
  label: string;
}

export type RecognizeOutcome =
  | { status: 'duplicate'; resultId: number }
  | { status: 'limited'; limit: PhotoLimitKind; retryAt: Date }
  | { status: 'saved'; resultId: number; chart: PhotoChart; values: PhotoValues }
  | {
      status: 'needsInput';
      reads: PhotoRead[];
      chart: PhotoChart | null;
      values: PhotoValues | null;
      readValues: PhotoValues[];
      fields: Field[];
      // Why the result couldn't be saved, when the readers agreed
      message?: string;
    };

const toPhotoChart = (chart: ChartCandidate): PhotoChart => ({
  sharedChartId: chart.sharedChartId,
  songName: chart.songName,
  label: chart.label,
});

/** The charts on the mix that a read's song title and difficulty badge point to */
export const findReadCharts = async (mixId: number, read: PhotoRead): Promise<ChartCandidate[]> => {
  if (!read.song_title || !read.chart_type || read.level == null) {
    return [];
  }
  const { tracks } = await findTracks(db, mixId, read.song_title, {
    relativeTolerance: TITLE_TOLERANCE,
  });
  if (tracks.length === 0) {
    return [];
  }
  const instances = await findChartInstances(
    db,
    tracks.map((track) => track.track),
    mixId,
    `${read.chart_type}${read.level}`
  );
  if (instances.length === 0) {
    return [];
  }

  // The song names, and on Phoenix 2 the Phoenix step counts of the same charts
  const sharedCharts = await db
    .selectFrom('shared_charts')
    .innerJoin('tracks', 'tracks.id', 'shared_charts.track')
    .leftJoin('chart_instances as phoenix', (join) =>
      join
        .onRef('phoenix.shared_chart', '=', 'shared_charts.id')
        .on('phoenix.mix', '=', MIXES.Phoenix)
    )
    .select([
      'shared_charts.id',
      'tracks.full_name',
      'phoenix.min_total_steps',
      'phoenix.max_total_steps',
    ])
    .where(
      'shared_charts.id',
      'in',
      instances.map((instance) => instance.shared_chart)
    )
    .execute();

  return instances.map((instance) => {
    const sharedChart = sharedCharts.find((row) => row.id === instance.shared_chart);
    return {
      sharedChartId: instance.shared_chart,
      chartInstanceId: instance.id,
      songName: sharedChart?.full_name ?? '',
      label: instance.label,
      level: instance.level,
      duration: instance.duration,
      minTotalSteps: instance.min_total_steps,
      maxTotalSteps: instance.max_total_steps,
      ...(mixId === MIXES.Phoenix2 && {
        phoenixMinTotalSteps: sharedChart?.min_total_steps ?? null,
        phoenixMaxTotalSteps: sharedChart?.max_total_steps ?? null,
      }),
    };
  });
};

/**
 * The charts on the mix whose song name and label contain the search words, for the chart
 * picker of a photo that matched none (also charts that nobody has played yet)
 */
export const searchMixCharts = async (mixId: number, search: string): Promise<PhotoChart[]> => {
  const words = search
    .toLowerCase()
    .split(' ')
    .filter((word) => word.length > 0);
  if (words.length === 0) {
    return [];
  }
  // The typed % and _ are matched as themselves
  const pattern = `%${words.map((word) => word.replace(/[\\%_]/g, '\\$&')).join('%')}%`;
  const rows = await db
    .selectFrom('chart_instances')
    .innerJoin('shared_charts', 'shared_charts.id', 'chart_instances.shared_chart')
    .innerJoin('tracks', 'tracks.id', 'shared_charts.track')
    .select(['chart_instances.shared_chart', 'tracks.full_name', 'chart_instances.label'])
    .where('chart_instances.mix', '=', mixId)
    .where(
      ({ fn, ref, val }) =>
        fn('concat', [
          fn('lower', [ref('tracks.full_name')]),
          val(' '),
          fn('lower', [ref('chart_instances.label')]),
        ]),
      'like',
      pattern
    )
    .orderBy('tracks.full_name')
    .orderBy('chart_instances.level')
    .limit(20)
    .execute();
  return rows.map((row) => ({
    sharedChartId: row.shared_chart,
    songName: row.full_name,
    label: row.label,
  }));
};

export const recognizePhoto = async (
  input: PhotoInput,
  readPhoto: ReadPhoto = defaultReadPhoto
): Promise<RecognizeOutcome> => {
  // Checked before anything is sent to the readers: a file selected again costs nothing
  const photoResult = await findPhotoResult(input.hash);
  if (photoResult) {
    return { status: 'duplicate', resultId: photoResult.id };
  }
  const limitReached = await getPhotoLimitReached(input.playerId, input.isAdmin);
  if (limitReached) {
    return { status: 'limited', limit: limitReached.kind, retryAt: limitReached.retryAt };
  }

  const mixId = MIXES[input.mix];
  const millionScoring = isMillionScoringMix(mixId);
  let cost = 0;
  let readerError: unknown = null;

  // A reader that fails (after its retry) or answers with invalid JSON reads nothing
  const readAndCheck = async (reader: Reader) => {
    try {
      const result = await readPhoto(reader, input.image, input.mix);
      cost += result.cost;
      await addPhotoRead(input.playerId, input.hash, result.cost);
      if (!result.read) {
        return { read: null, check: null };
      }
      const charts = await findReadCharts(mixId, result.read);
      return { read: result.read, check: checkRead(result.read, charts, mixId) };
    } catch (e) {
      debug('%s failed: %o', reader.model, e);
      readerError = e;
      return { read: null, check: null };
    }
  };

  let results: Awaited<ReturnType<typeof readAndCheck>>[];
  if (millionScoring) {
    // The same model mostly repeats its mistake: the second read is another vendor's
    const first = await readAndCheck(READER_A);
    results = passes(first.check) ? [first] : [first, await readAndCheck(READER_B)];
  } else {
    results = await Promise.all([readAndCheck(READER_A), readAndCheck(READER_B)]);
    // A third reader from another vendor, when the two don't both pass and agree
    if (
      decide(
        mixId,
        results.map((result) => result.check)
      ).status !== 'confident'
    ) {
      results.push(await readAndCheck(READER_C));
    }
  }
  if (cost > 0) {
    await db
      .updateTable('players')
      .set({ ocr_cost: sql`ocr_cost + ${cost}` })
      .where('id', '=', input.playerId)
      .execute();
  }
  const checks = results.map((result) => result.check);
  const reads = results.flatMap((result) => (result.read ? [result.read] : []));
  if (readerError && checks.every((check) => check == null)) {
    // Nothing was read: the web offers to try again
    throw readerError;
  }

  const decision = decide(mixId, checks);
  if (decision.status === 'needsInput') {
    return {
      status: 'needsInput',
      reads,
      chart: decision.chart && toPhotoChart(decision.chart),
      values: decision.values,
      readValues: decision.readValues,
      fields: decision.fields,
    };
  }

  // A second photo of the same screen has another hash
  const { chart, values } = decision;
  const samePlay = await findSamePlay(input.playerId, chart.sharedChartId, values);
  if (samePlay) {
    await rememberDuplicatePhoto(samePlay.id, input.hash);
    return { status: 'duplicate', resultId: samePlay.id };
  }
  if (!input.autoSave) {
    // Nothing in doubt: the user only confirms
    return {
      status: 'needsInput',
      reads,
      chart: toPhotoChart(chart),
      values,
      readValues: [values],
      fields: [],
    };
  }

  try {
    const resultId = await addResult(input.playerId, {
      ...values,
      screenshotTempPath: input.screenshotPath,
      playerId: input.playerId,
      mix: input.mix,
      date: input.date,
      isExactDate: input.isExactDate,
      sharedChartId: chart.sharedChartId,
      photoHash: input.hash,
    });
    return { status: 'saved', resultId, chart: toPhotoChart(chart), values };
  } catch (e) {
    // The manual input's own checks can still refuse it (rank mode on a chart that can't
    // have it, a score over the chart's maximum): the user decides
    if (e instanceof StatusError && e.status === 400) {
      return {
        status: 'needsInput',
        reads,
        chart: toPhotoChart(chart),
        values,
        readValues: [values],
        fields: values.mod === 'VJ' ? ['mod'] : [...NUMBER_FIELDS],
        message: e.message,
      };
    }
    throw e;
  }
};
