import { naiveSeconds, pyDict, pyRepr } from './format';
import { getStepStats, totalSteps, type WithStats } from './stats';
import type { ChartInstance, ResultRow, ValidResult } from './types';
import type { DB, Results } from '@pumpking/database/database';
import { addEvent } from '@pumpking/database/events';
import { randomInt } from 'crypto';
import { type Insertable, type Kysely, sql, type Updateable } from 'kysely';

/**
 * Stores a validated result (the legacy `results_update.py`): adds it, or merges it into
 * the same player's result with the same score on the chart when it's the same play
 * seen again. With `checkOnly` nothing is written, and the status says what would be
 * done. Otherwise run it in a transaction: an added or updated result gets its
 * `resultAdded` event in it, and the effects job applies pp / exp afterwards.
 *
 * Also learns the chart's number of steps from results with complete stats, which the
 * validation of later results relies on.
 */

export interface StoreOptions {
  // piu-spy's manual mode (e.g. an import of the player's profile): merges into the
  // closest-in-time result with the same score and stats
  isManual: boolean;
  checkOnly: boolean;
  // Lines saying what changed, sent back to piu-spy / shown to admins
  report: string[];
}

export interface StoreStatus {
  status: string;
}

// Two recognitions of the same play can differ by a few seconds, when a different frame
// of the result screen is picked
const SAME_PLAY_SECONDS = 10;

// The columns a stored result is compared on; the datetimes as they're stored
const selectSimilarResults = (db: Kysely<DB>, row: ResultRow) =>
  db
    .selectFrom('results')
    .select([
      'id',
      'screen_file',
      'recognition_notes',
      sql<string>`CAST(added AS CHAR)`.as('added'),
      'agent',
      'track_name',
      'mix_name',
      'chart_label',
      'player_name',
      sql<string>`CAST(gained AS CHAR)`.as('gained'),
      'exact_gain_date',
      'rank_mode',
      'mods_list',
      'score',
      'score_increase',
      'misses',
      'bads',
      'goods',
      'greats',
      'perfects',
      'max_combo',
      'calories',
      'grade',
      'is_pass',
      'plate',
      'recognized_player_id',
      'mix',
      'chart_instance',
      'shared_chart',
      'score_phoenix',
    ])
    .where('chart_instance', '=', row.chart_instance)
    .where('recognized_player_id', '=', row.recognized_player_id)
    .where('score', '=', row.score)
    .orderBy('id')
    .execute();

type StoredResult = Awaited<ReturnType<typeof selectSimilarResults>>[number];

// The naive datetime strings are written as they are, so no time zone shifts them
const asResultColumns = (fields: Partial<ResultRow>) =>
  Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));

const randomToken = (length: number) => {
  const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length }, () => letters[randomInt(letters.length)]).join('');
};

const updateChartNumberOfSteps = async (
  db: Kysely<DB>,
  chart: ChartInstance,
  fields: WithStats,
  resultId: number,
  { checkOnly, report }: StoreOptions
) => {
  const stepStats = getStepStats(fields);
  if (!stepStats) {
    return;
  }
  const steps = totalSteps(stepStats);

  const update: { max_total_steps?: number; min_total_steps?: number } = {};
  if (chart.max_total_steps == null || steps > chart.max_total_steps) {
    update.max_total_steps = steps;
    report.push(`Chart #${chart.id} got max_total_steps '${steps}' from result #${resultId}`);
  }
  if (chart.min_total_steps == null || steps < chart.min_total_steps) {
    update.min_total_steps = steps;
    report.push(`Chart #${chart.id} got min_total_steps '${steps}' from result #${resultId}`);
  }
  if (Object.keys(update).length === 0) {
    return;
  }

  if (!checkOnly) {
    await db.updateTable('chart_instances').set(update).where('id', '=', chart.id).execute();
  }
  report.push(`Chart #${chart.id} update: '${pyDict(update)}'`);
};

// Booleans from piu-spy compare equal to the stored 0 / 1
const sameValue = (a: unknown, b: unknown) =>
  (typeof a === 'boolean' ? Number(a) : a) === (typeof b === 'boolean' ? Number(b) : b);

// Adds what the new recognition knows to the stored result
const updateResult = async (
  db: Kysely<DB>,
  chart: ChartInstance,
  stored: StoredResult,
  row: ResultRow,
  options: StoreOptions
): Promise<StoreStatus> => {
  const changes = Object.fromEntries(
    Object.entries(row).filter(
      ([field, value]) =>
        value !== undefined && !sameValue(value, stored[field as keyof StoredResult])
    )
  ) as Partial<ResultRow>;

  // A new `added` time alone isn't a change
  if (!Object.keys(changes).some((field) => field !== 'added')) {
    return { status: `result #${stored.id} is up-to-date` };
  }

  if (!options.checkOnly) {
    await db
      .updateTable('results')
      .set(asResultColumns(changes) as Updateable<Results>)
      .where('id', '=', stored.id)
      .execute();
  }
  const diff = Object.entries(changes)
    .filter(([field]) => field !== 'added')
    .map(
      ([field, value]) =>
        `'${field}': (${pyRepr(stored[field as keyof StoredResult])}, ${pyRepr(value)})`
    );
  options.report.push(`Result #${stored.id} update: '{${diff.join(', ')}}'`);

  await updateChartNumberOfSteps(db, chart, { ...stored, ...changes }, stored.id, options);
  if (!options.checkOnly) {
    await addEvent(db, 'resultAdded', { resultId: stored.id });
  }

  const status = `result #${stored.id} updated`;
  options.report.push(`Result operation: '${status}'`);
  return { status };
};

const addResult = async (
  db: Kysely<DB>,
  chart: ChartInstance,
  row: ResultRow,
  options: StoreOptions
): Promise<StoreStatus> => {
  let resultId = -1;
  if (!options.checkOnly) {
    const { insertId } = await db
      .insertInto('results')
      .values({
        ...asResultColumns(row),
        token: randomToken(10),
        is_new_best_score: 0,
      } as Insertable<Results>)
      .executeTakeFirstOrThrow();
    resultId = Number(insertId);
  }

  await updateChartNumberOfSteps(db, chart, row, resultId, options);
  if (!options.checkOnly) {
    await addEvent(db, 'resultAdded', { resultId });
  }

  const status = 'result added';
  options.report.push(`Result operation: '${status}'`);
  return { status };
};

// Manual results (e.g. from a profile import) may lack the perfects and the grade, so a
// result with the same score is the same play when the other stats agree
const MANUAL_MATCHED_FIELDS = ['misses', 'bads', 'goods', 'greats', 'max_combo'] as const;

const updateWithManualResult = async (
  db: Kysely<DB>,
  chart: ChartInstance,
  similarResults: StoredResult[],
  row: ResultRow,
  options: StoreOptions
) => {
  const byTime = [...similarResults].sort(
    (a, b) =>
      Math.abs(naiveSeconds(a.gained) - naiveSeconds(row.gained)) -
      Math.abs(naiveSeconds(b.gained) - naiveSeconds(row.gained))
  );
  // The legacy code meant to skip the results whose stats differ, but its check never
  // skipped any (a `continue` of the inner loop)
  const sameStats = byTime.find((stored) =>
    MANUAL_MATCHED_FIELDS.every(
      (field) => stored[field] == null || stored[field] === (row[field] ?? null)
    )
  );
  if (!sameStats) {
    return null;
  }

  // What the manual result lacks, the stored one has
  const merged: ResultRow = {
    ...row,
    perfects: row.perfects === undefined ? sameStats.perfects : row.perfects,
    grade: row.grade === '?' ? sameStats.grade : row.grade,
  };
  return updateResult(db, chart, sameStats, merged, options);
};

export const storeResult = async (
  db: Kysely<DB>,
  { row, chart }: ValidResult,
  options: StoreOptions
): Promise<StoreStatus> => {
  const similarResults = await selectSimilarResults(db, row);
  const gained = naiveSeconds(row.gained);

  if (options.isManual) {
    const status = await updateWithManualResult(db, chart, similarResults, row, options);
    if (status) {
      return status;
    }
  } else if (row.exact_gain_date) {
    for (const stored of similarResults) {
      // An exact date is better than a date that was only known roughly
      if (!stored.exact_gain_date && gained <= naiveSeconds(stored.gained)) {
        return updateResult(db, chart, stored, row, options);
      }
      // The same play recognized again: the later recognition is probably better
      if (
        stored.exact_gain_date &&
        Math.abs(naiveSeconds(stored.gained) - gained) < SAME_PLAY_SECONDS
      ) {
        return updateResult(db, chart, stored, row, options);
      }
    }
  } else {
    for (const stored of similarResults) {
      if (stored.exact_gain_date && naiveSeconds(stored.gained) <= gained) {
        return { status: `detailed result #${stored.id} is up-to-date` };
      }
    }
  }

  return addResult(db, chart, row, options);
};
