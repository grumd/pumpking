import { describeChanges } from './report';
import type { Purgatory } from '@pumpking/database/database';
import { db } from '@pumpking/database/db';
import createDebug from 'debug';
import type { Updateable } from 'kysely';
import { error } from 'utils';

const debug = createDebug('backend-ts:services:purgatory');

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

// What the recheck did with a row, as ingest answers (packages/ingest, ingestion/purgatory.ts)
export type RecheckOutcome =
  // Valid now: moved to results (the status says whether it was added or merged)
  | { id: number; outcome: 'added'; status: string }
  | { id: number; outcome: 'discarded'; reason: string }
  | { id: number; outcome: 'stays'; reason: string; reasonChanged: boolean };

interface RecheckResponse {
  outcomes?: RecheckOutcome[];
  // The lines of the stored results
  report?: string[];
  error?: string;
}

export interface RecheckOptions {
  // Skip the check of the score against the stats, for a score the admin vouches for
  skipScoreCheck?: boolean;
}

// Ingest runs on the same host
const ingestUrl = () => process.env.INGEST_URL || 'http://127.0.0.1:3002';

/**
 * Rechecks purgatory rows, all of them or one: rows that are valid now move to results,
 * discarded ones are deleted, the others get their new reason. Ingest does it, so a row
 * is judged exactly as a new result would be
 */
export const recheckPurgatory = async (id?: number, options: RecheckOptions = {}) => {
  if (id != null) {
    await getPurgatoryRow(id);
  }

  let body: RecheckResponse;
  try {
    const response = await fetch(`${ingestUrl()}/internal/purgatory/recheck`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, ...options }),
      signal: AbortSignal.timeout(120_000),
    });
    body = (await response.json()) as RecheckResponse;
  } catch (e) {
    debug(e);
    throw error(502, `Ingest didn't answer: ${(e as Error).message}`);
  }
  if (body.error || !body.outcomes || !body.report) {
    throw error(502, `Ingest failed to recheck: ${body.error ?? 'no outcomes in its answer'}`);
  }

  const { outcomes, report } = body;
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

export const updateAndRecheckPurgatoryRow = async (
  id: number,
  edit: PurgatoryEdit,
  options: RecheckOptions = {}
) => {
  const { report: editReport } = await updatePurgatoryRow(id, edit);
  const recheck = await recheckPurgatory(id, options);
  return { outcomes: recheck.outcomes, report: [...editReport, ...recheck.report] };
};
