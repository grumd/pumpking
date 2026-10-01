import { checkResult } from './checkResult';
import { storeResult } from './storeResult';
import type { ResultData } from './types';
import type { DB, Purgatory } from '@pumpking/database/database';
import { db } from '@pumpking/database/db';
import { type Insertable, type Kysely, sql } from 'kysely';

/**
 * Purgatory holds the results that ingestion couldn't match to a player, track or chart,
 * or whose stats failed validation, with the reason. An admin fixes the row (or the
 * arcade names / chart it failed on) and rechecks it.
 */

// purgatory.reason is a VARCHAR(512); a long list of best guesses mustn't fail the insert
const REASON_LENGTH = 512;
// purgatory.screen_file is a VARCHAR(150), results.screen_file a VARCHAR(300): a longer
// name is a reason to send a result here, and mustn't fail the insert either (the legacy
// code failed the request)
const SCREEN_FILE_LENGTH = 150;

const PURGATORY_FIELDS = [
  'screen_file',
  'recognition_notes',
  'added',
  'agent',
  'track_name',
  'mix_name',
  'chart_label',
  'player_name',
  'gained',
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
  'grade',
  'is_pass',
  'plate',
  'max_combo',
  'calories',
] as const;

export const addToPurgatory = async (database: Kysely<DB>, data: ResultData, reason: string) => {
  const row = Object.fromEntries(
    PURGATORY_FIELDS.filter((field) => data[field] !== undefined).map((field) => [
      field,
      data[field],
    ])
  );
  // The naive datetime strings are written as they are
  const { insertId } = await database
    .insertInto('purgatory')
    .values({
      ...row,
      screen_file: data.screen_file?.slice(0, SCREEN_FILE_LENGTH),
      reason: reason.slice(0, REASON_LENGTH),
    } as Insertable<Purgatory>)
    .executeTakeFirstOrThrow();
  return { status: 'added to purgatory', id: Number(insertId), reason };
};

// What a recheck did with a row
export type RecheckOutcome =
  // Valid now: moved to results (the status says whether it was added or merged)
  | { id: number; outcome: 'added'; status: string }
  | { id: number; outcome: 'discarded'; reason: string }
  | { id: number; outcome: 'stays'; reason: string; reasonChanged: boolean };

/**
 * Rechecks purgatory rows, all of them or one (the legacy `POST_recheckPurgatory`): rows
 * that are valid now move to results, discarded ones are deleted, the others get their
 * new reason. Returns the outcome per row and the report lines of the stored results
 */
export const recheckPurgatory = async (id?: number) => {
  // The naive datetimes as strings: these columns come after `*`, so they replace the
  // DATETIME ones in the rows
  let query = db
    .selectFrom('purgatory')
    .selectAll()
    .select([
      sql<string>`CAST(added AS CHAR)`.as('added'),
      sql<string>`CAST(gained AS CHAR)`.as('gained'),
    ])
    .orderBy('id');
  if (id != null) {
    query = query.where('id', '=', id);
  }
  const rows = await query.execute();

  const report: string[] = [];
  if (rows.length >= 2) {
    report.push(`Rechecking items IDs [${rows[0].id}..${rows[rows.length - 1].id}]`);
  }

  const outcomes: RecheckOutcome[] = [];
  for (const row of rows) {
    const { id: rowId, reason, steps_sum: _stepsSum, ...fields } = row;
    const data: ResultData = fields;
    const checked = await checkResult(db, data);
    switch (checked.outcome) {
      case 'valid': {
        const { status } = await db.transaction().execute(async (trx) => {
          await trx.deleteFrom('purgatory').where('id', '=', rowId).execute();
          return storeResult(trx, checked, { isManual: false, checkOnly: false, report });
        });
        outcomes.push({ id: rowId, outcome: 'added', status });
        break;
      }
      case 'unrecognized': {
        const reasonChanged = checked.reason !== reason;
        if (reasonChanged) {
          await db
            .updateTable('purgatory')
            .set({ reason: checked.reason.slice(0, REASON_LENGTH) })
            .where('id', '=', rowId)
            .execute();
        }
        outcomes.push({ id: rowId, outcome: 'stays', reason: checked.reason, reasonChanged });
        break;
      }
      case 'discarded':
        await db.deleteFrom('purgatory').where('id', '=', rowId).execute();
        outcomes.push({ id: rowId, outcome: 'discarded', reason: checked.reason });
        break;
    }
  }

  report.push(`Rechecked ${rows.length} items in purgatory`);
  return { outcomes, report };
};
