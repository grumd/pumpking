import { checkResult } from './checkResult';
import { storeResult } from './storeResult';
import type { CheckOptions, ResultData } from './types';
import type { DB, Purgatory } from '@pumpking/database/database';
import { db } from '@pumpking/database/db';
import { type Insertable, type Kysely, sql } from 'kysely';

const REASON_LENGTH = 512;
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

export type RecheckOutcome =
  | { id: number; outcome: 'added'; status: string }
  | { id: number; outcome: 'discarded'; reason: string }
  | { id: number; outcome: 'stays'; reason: string; reasonChanged: boolean };

export const recheckPurgatory = async (id?: number, options: CheckOptions = {}) => {
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
    const checked = await checkResult(db, data, options);
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
