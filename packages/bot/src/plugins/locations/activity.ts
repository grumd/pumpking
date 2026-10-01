import { db } from '@pumpking/database/db';
import { sql } from 'kysely';

/**
 * Who played where recently, from the agents' heartbeat sessions (`agent_sessions`) and
 * their results, for the locations plugin. Ported from the legacy piu-top `logs.py` (C5 / C6
 * in docs/python-api-migration/PLAN.md), with the same shapes.
 *
 * Dates are the naive "YYYY-MM-DD HH:MM:SS" strings the legacy API printed. The session
 * times are UTC; `gained` is compared to UTC too, as it always was.
 */

// Hidden players are shown under this name
export const UNKNOWN_PLAYER = 'PUMP IT UP';

// Results older than 6 hours don't count as "played recently"
const recentThreshold = sql<Date>`UTC_TIMESTAMP() - INTERVAL 6 HOUR`;

export interface AgentLastPlayers {
  // Player name -> when they last scored, newest first
  lastResults: Record<string, string>;
  // The agent's latest session; missing when it never sent a heartbeat
  agentStatus?: { startedMinsAgo: number; updatedMinsAgo: number };
}

/** C6: the players who scored on one agent in the last 6 hours, and its uptime */
export const getAgentLastPlayers = async (agentId: number): Promise<AgentLastPlayers> => {
  const players = await db
    .selectFrom('results')
    .innerJoin('players', 'players.id', 'results.player_id')
    .select([
      sql<string>`DATE_FORMAT(MAX(results.gained), '%Y-%m-%d %H:%i:%s')`.as('lastGainedScoreAt'),
      'players.nickname',
      'players.hidden',
    ])
    .where('results.agent', '=', agentId)
    .where('results.exact_gain_date', '=', 1)
    .where('results.gained', '>', recentThreshold)
    .groupBy('players.id')
    .orderBy(sql`MAX(results.gained)`, 'desc')
    .execute();

  const result: AgentLastPlayers = { lastResults: {} };

  const status = await db
    .selectFrom('agent_sessions')
    .select([
      sql<number>`TIMESTAMPDIFF(MINUTE, added_at, UTC_TIMESTAMP())`.as('startedMinsAgo'),
      sql<number>`TIMESTAMPDIFF(MINUTE, last_updated_at, UTC_TIMESTAMP())`.as('updatedMinsAgo'),
    ])
    .where('agent_id', '=', agentId)
    .orderBy('last_updated_at', 'desc')
    .limit(1)
    .executeTakeFirst();
  if (status) {
    result.agentStatus = {
      startedMinsAgo: Number(status.startedMinsAgo),
      updatedMinsAgo: Number(status.updatedMinsAgo),
    };
  }

  for (const player of players) {
    const name = player.hidden ? UNKNOWN_PLAYER : player.nickname;
    if (!(name in result.lastResults)) {
      result.lastResults[name] = player.lastGainedScoreAt;
    }
  }
  return result;
};

export interface AgentStatus {
  name: string;
  title: string;
  startedAt: string;
  lastUpdatedAt: string;
  // Player name -> when they last scored (last 6 hours)
  players: Record<string, string>;
}

/** C5: every agent that has sessions, keyed by agent id, with its recent players */
export const getAgentsStatus = async (): Promise<Record<string, AgentStatus>> => {
  const sessions = await db
    .selectFrom('agent_sessions')
    .innerJoin('agents', 'agents.id', 'agent_sessions.agent_id')
    .select([
      'agent_sessions.agent_id',
      'agents.name',
      'agents.title',
      sql<string>`DATE_FORMAT(MAX(agent_sessions.added_at), '%Y-%m-%d %H:%i:%s')`.as('startedAt'),
      sql<string>`DATE_FORMAT(MAX(agent_sessions.last_updated_at), '%Y-%m-%d %H:%i:%s')`.as(
        'lastUpdatedAt'
      ),
    ])
    .groupBy('agent_sessions.agent_id')
    .execute();

  const agents: Record<string, AgentStatus> = {};
  if (sessions.length === 0) {
    return agents;
  }
  for (const session of sessions) {
    agents[session.agent_id] = {
      name: session.name,
      title: session.title,
      startedAt: session.startedAt,
      lastUpdatedAt: session.lastUpdatedAt,
      players: {},
    };
  }

  const players = await db
    .selectFrom('results')
    .innerJoin('players', 'players.id', 'results.player_id')
    .select([
      'results.agent',
      sql<string>`DATE_FORMAT(MAX(results.gained), '%Y-%m-%d %H:%i:%s')`.as('lastGainedScoreAt'),
      'players.nickname',
      'players.hidden',
    ])
    .where(
      'results.agent',
      'in',
      sessions.map((session) => session.agent_id)
    )
    .where('results.exact_gain_date', '=', 1)
    .where('results.gained', '>', recentThreshold)
    .groupBy(['results.agent', 'players.id'])
    .orderBy(sql`MAX(results.gained)`, 'desc')
    .execute();

  for (const player of players) {
    const name = player.hidden ? UNKNOWN_PLAYER : player.nickname;
    const agentPlayers = agents[player.agent].players;
    if (!(name in agentPlayers)) {
      agentPlayers[name] = player.lastGainedScoreAt;
    }
  }
  return agents;
};
