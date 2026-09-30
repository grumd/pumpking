import type { AgentCall } from './legacy';
import { db } from '@pumpking/core/db';
import { sql } from 'kysely';

/**
 * piu-spy's heartbeat (the legacy `logs.POST_status`): one `agent_sessions` row per run of
 * an agent, keyed by the time it started, with its latest status. A new session also
 * clears the agent's sessions older than a week
 */
export const saveStatus = async ({ args, agent }: AgentCall) => {
  const { started, ...status } = (args.status ?? {}) as Record<string, unknown>;
  const statusJson = JSON.stringify(status);

  const { numInsertedOrUpdatedRows } = await db
    .insertInto('agent_sessions')
    .values({
      agent_id: agent.id,
      client_session_mark: String(started),
      added_at: sql`UTC_TIMESTAMP()`,
      last_updated_at: sql`UTC_TIMESTAMP()`,
      status: statusJson,
    })
    .onDuplicateKeyUpdate({ last_updated_at: sql`UTC_TIMESTAMP()`, status: statusJson })
    .executeTakeFirstOrThrow();

  // MySQL counts 1 for an inserted row, 2 for an updated one
  if (numInsertedOrUpdatedRows === BigInt(1)) {
    await db
      .deleteFrom('agent_sessions')
      .where('agent_id', '=', agent.id)
      .where('last_updated_at', '<', sql<Date>`UTC_TIMESTAMP() - INTERVAL 7 DAY`)
      .execute();
  }
  return {};
};
