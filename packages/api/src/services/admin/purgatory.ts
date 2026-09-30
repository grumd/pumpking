import { describeChanges } from './report';
import type { Purgatory } from '@pumpking/core/database';
import { db } from '@pumpking/core/db';
import createDebug from 'debug';
import type { Updateable } from 'kysely';
import { error } from 'utils';

const debug = createDebug('backend-ts:service:admin-purgatory');

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

// What happened to a row in a recheck
export type RecheckOutcome =
  | { id: number; outcome: 'added' }
  | { id: number; outcome: 'discarded'; reason: string }
  | { id: number; outcome: 'stays'; reason: string; reasonChanged: boolean };

interface LegacyRecheckResponse {
  error?: string;
  // One per row: the result's add / update status when it left purgatory, or what
  // changed for the rows that didn't
  updates?: (
    | { status: string }
    | { id: number; from: string; to: string }
    | { id: number; from: string; discarded: string }
  )[];
  report?: string[];
}

/**
 * Rechecks purgatory rows, all of them or one: rows that are valid now move to results,
 * discarded ones are deleted, the others get their new reason.
 *
 * Until ingestion is ported to TS (W7), validation exists only in the Python backend, so
 * this calls its `/admin/purgatory/recheck` as the super agent (agent #1). Needs
 * LEGACY_API_URL. Python adds the moved results itself and calls the TS
 * result-added-effect route for them, as for any new result
 */
export const recheckPurgatory = async (id?: number) => {
  const baseUrl = process.env.LEGACY_API_URL;
  if (!baseUrl) {
    throw error(
      503,
      'Rechecking needs the legacy Python API: set LEGACY_API_URL in packages/api/.env'
    );
  }
  const superAgent = await db
    .selectFrom('agents')
    .select(['name', 'token'])
    .where('id', '=', 1)
    .executeTakeFirst();
  if (!superAgent) {
    throw error(500, 'The super agent (agent #1) is missing');
  }

  let before = db.selectFrom('purgatory').select(['id', 'reason']);
  if (id != null) {
    before = before.where('id', '=', id);
  }
  const rows = await before.execute();
  if (rows.length === 0) {
    throw error(404, id != null ? `Purgatory row not found: id ${id}` : 'Purgatory is empty');
  }

  let body: LegacyRecheckResponse;
  try {
    const response = await fetch(`${baseUrl}/admin/purgatory/recheck`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'agent-name': superAgent.name,
        'agent-token': superAgent.token,
      },
      body: JSON.stringify(id != null ? { ids: [id, id] } : {}),
      signal: AbortSignal.timeout(120_000),
    });
    body = (await response.json()) as LegacyRecheckResponse;
  } catch (e) {
    debug(e);
    throw error(502, `The legacy Python API didn't answer: ${(e as Error).message}`);
  }
  if (body.error || !body.updates) {
    // Python answers errors with 200 and the traceback, whose last line is the error
    const lastLine = body.error?.trim().split('\n').pop();
    throw error(502, `The legacy Python API failed: ${lastLine ?? 'no updates in its response'}`);
  }

  const after = new Map(
    (
      await db
        .selectFrom('purgatory')
        .select(['id', 'reason'])
        .where(
          'id',
          'in',
          rows.map((row) => row.id)
        )
        .execute()
    ).map((row) => [row.id, row.reason])
  );
  const discarded = new Map(
    body.updates.flatMap((update) =>
      'discarded' in update ? [[update.id, update.discarded] as const] : []
    )
  );

  const outcomes: RecheckOutcome[] = rows.map((row) => {
    const reason = after.get(row.id);
    const discardReason = discarded.get(row.id);
    if (reason !== undefined) {
      return { id: row.id, outcome: 'stays', reason, reasonChanged: reason !== row.reason };
    }
    if (discardReason !== undefined) {
      return { id: row.id, outcome: 'discarded', reason: discardReason };
    }
    return { id: row.id, outcome: 'added' };
  });

  const report = [
    ...outcomes.map((o) => {
      switch (o.outcome) {
        case 'added':
          return `Purgatory #${o.id}: valid, moved to results`;
        case 'discarded':
          return `Purgatory #${o.id}: discarded (${o.reason})`;
        case 'stays':
          return `Purgatory #${o.id}: still invalid${o.reasonChanged ? ', new reason' : ''}: ${
            o.reason
          }`;
      }
    }),
    ...(body.report ?? []),
  ];
  return { outcomes, report };
};

export const updateAndRecheckPurgatoryRow = async (id: number, edit: PurgatoryEdit) => {
  const { report: editReport } = await updatePurgatoryRow(id, edit);
  const recheck = await recheckPurgatory(id);
  return { outcomes: recheck.outcomes, report: [...editReport, ...recheck.report] };
};
