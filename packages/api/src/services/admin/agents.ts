import { describeChanges } from './report';
import { db } from '@pumpking/core/db';
import crypto from 'crypto';
import { error } from 'utils';

// Agents are the piu-spy installations at arcades that send results. Each logs in with
// its name and token (the `agent-name` / `agent-token` headers); uploads go to a folder
// named after it. Agent #1 is the legacy "super agent" the desktop admin tool logs in as

const TOKEN_LENGTH = 30;
const TOKEN_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const randomToken = () =>
  Array.from(
    { length: TOKEN_LENGTH },
    () => TOKEN_ALPHABET[crypto.randomInt(TOKEN_ALPHABET.length)]
  ).join('');

const checkName = async (name: string, agentId: number | null) => {
  if (!/^[-._a-zA-Z0-9]{1,30}$/.test(name)) {
    throw error(400, `Name '${name}' is not valid: use up to 30 of a-z, A-Z, 0-9, '-', '.', '_'`);
  }
  let query = db.selectFrom('agents').select('id').where('name', '=', name);
  if (agentId != null) {
    query = query.where('id', '<>', agentId);
  }
  const sameName = await query.executeTakeFirst();
  if (sameName) {
    throw error(400, `Agent #${sameName.id} already has name '${name}'`);
  }
};

// Without tokens: they're shown one at a time (getAgentToken)
export const listAgents = async () => {
  return db
    .selectFrom('agents')
    .leftJoin('agent_sessions', 'agent_sessions.agent_id', 'agents.id')
    .select(({ fn }) => [
      'agents.id',
      'agents.name',
      'agents.title',
      fn.max('agent_sessions.last_updated_at').as('last_seen_at'),
    ])
    .groupBy(['agents.id', 'agents.name', 'agents.title'])
    .orderBy('agents.id')
    .execute();
};

export const getAgentToken = async (agentId: number) => {
  const agent = await db
    .selectFrom('agents')
    .select('token')
    .where('id', '=', agentId)
    .executeTakeFirst();
  if (!agent) {
    throw error(404, `Agent not found: id ${agentId}`);
  }
  return { token: agent.token };
};

export const createAgent = async (fields: { name: string; title: string }) => {
  const name = fields.name.trim();
  await checkName(name, null);
  const token = randomToken();
  const { insertId } = await db
    .insertInto('agents')
    .values({ name, title: fields.title.trim() || name, token })
    .executeTakeFirstOrThrow();
  const id = Number(insertId);
  return { id, token, report: [`Agent #${id} '${name}' created`] };
};

export const updateAgent = async (agentId: number, fields: { name: string; title: string }) => {
  const agent = await db
    .selectFrom('agents')
    .select(['id', 'name', 'title'])
    .where('id', '=', agentId)
    .executeTakeFirst();
  if (!agent) {
    throw error(404, `Agent not found: id ${agentId}`);
  }
  const changes = { name: fields.name.trim(), title: fields.title.trim() };
  if (changes.name !== agent.name) {
    await checkName(changes.name, agentId);
  }
  await db.updateTable('agents').set(changes).where('id', '=', agentId).execute();
  const report = describeChanges(`Agent #${agentId}`, agent, changes);
  return { report: report.length ? report : [`Agent #${agentId}: nothing changed`] };
};

// The old token stops working at once: the agent needs the new one in its config
export const rotateAgentToken = async (agentId: number) => {
  const token = randomToken();
  const { numUpdatedRows } = await db
    .updateTable('agents')
    .set({ token })
    .where('id', '=', agentId)
    .executeTakeFirst();
  if (!numUpdatedRows) {
    throw error(404, `Agent not found: id ${agentId}`);
  }
  return { token, report: [`Agent #${agentId}: token replaced`] };
};
