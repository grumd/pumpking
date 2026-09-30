import { describeChanges } from './report';
import type { Purgatory } from '@pumpking/core/database';
import { db } from '@pumpking/core/db';
import { recheckPurgatory as recheckRows } from '@pumpking/core/ingestion/purgatory';
import type { Updateable } from 'kysely';
import { error } from 'utils';

// Purgatory holds the results that ingestion couldn't match to a player, track or chart,
// or whose stats failed validation, with the reason. An admin fixes the row (or the
// arcade names / chart it failed on) and rechecks it

export const listPurgatory = async () => {
  return db
    .selectFrom('purgatory')
    .leftJoin('agents', 'agents.id', 'purgatory.agent')
    .select([
      'purgatory.id',
      'purgatory.reason',
      'purgatory.added',
      'purgatory.gained',
      'purgatory.agent',
      'agents.name as agent_name',
      'purgatory.mix_name',
      'purgatory.track_name',
      'purgatory.chart_label',
      'purgatory.player_name',
      'purgatory.score',
      'purgatory.grade',
    ])
    .orderBy('purgatory.id', 'desc')
    .execute();
};

export const getPurgatoryRow = async (id: number) => {
  const row = await db
    .selectFrom('purgatory')
    .leftJoin('agents', 'agents.id', 'purgatory.agent')
    .selectAll('purgatory')
    .select('agents.name as agent_name')
    .where('purgatory.id', '=', id)
    .executeTakeFirst();
  if (!row) {
    throw error(404, `Purgatory row not found: id ${id}`);
  }
  return row;
};

// The fields an admin can fix, as in the legacy editAndRecheck
export interface PurgatoryEdit {
  track_name?: string;
  chart_label?: string;
  player_name?: string;
  mods_list?: string | null;
  score?: number | null;
  score_increase?: number | null;
  grade?: string | null;
  is_pass?: number | null;
  plate?: string | null;
  perfects?: number | null;
  greats?: number | null;
  goods?: number | null;
  bads?: number | null;
  misses?: number | null;
  max_combo?: number | null;
  calories?: number | null;
}

export const updatePurgatoryRow = async (id: number, edit: PurgatoryEdit) => {
  const row = await getPurgatoryRow(id);
  const changes: Updateable<Purgatory> = edit;
  const report = describeChanges(`Purgatory #${id}`, row, changes);
  if (report.length > 0) {
    await db.updateTable('purgatory').set(changes).where('id', '=', id).execute();
  }
  return { report };
};

export const deletePurgatoryRow = async (id: number) => {
  const { numDeletedRows } = await db
    .deleteFrom('purgatory')
    .where('id', '=', id)
    .executeTakeFirst();
  if (!numDeletedRows) {
    throw error(404, `Purgatory row not found: id ${id}`);
  }
  return { report: [`Purgatory #${id} deleted`] };
};

/**
 * Rechecks purgatory rows, all of them or one: rows that are valid now move to results,
 * discarded ones are deleted, the others get their new reason. Uses the ingestion's own
 * validation (core), so a row is judged exactly as a new result would be
 */
export const recheckPurgatory = async (id?: number) => {
  if (id != null) {
    await getPurgatoryRow(id);
  }
  const { outcomes, report } = await recheckRows(id);
  if (outcomes.length === 0) {
    throw error(404, 'Purgatory is empty');
  }

  return {
    outcomes,
    report: [
      ...outcomes.map((o) => {
        switch (o.outcome) {
          case 'added':
            return `Purgatory #${o.id}: valid, moved to results (${o.status})`;
          case 'discarded':
            return `Purgatory #${o.id}: discarded (${o.reason})`;
          case 'stays':
            return `Purgatory #${o.id}: still invalid${o.reasonChanged ? ', new reason' : ''}: ${
              o.reason
            }`;
        }
      }),
      ...report,
    ],
  };
};

export const updateAndRecheckPurgatoryRow = async (id: number, edit: PurgatoryEdit) => {
  const { report: editReport } = await updatePurgatoryRow(id, edit);
  const recheck = await recheckPurgatory(id);
  return { outcomes: recheck.outcomes, report: [...editReport, ...recheck.report] };
};
