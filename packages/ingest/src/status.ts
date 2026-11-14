import type { AgentCall } from './agentApi';
import { db } from '@pumpking/database/db';
import { sql } from 'kysely';

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

  if (numInsertedOrUpdatedRows === BigInt(1)) {
    await db
      .deleteFrom('agent_sessions')
      .where('agent_id', '=', agent.id)
      .where('last_updated_at', '<', sql<Date>`UTC_TIMESTAMP() - INTERVAL 7 DAY`)
      .execute();
  }
  return {};
};
