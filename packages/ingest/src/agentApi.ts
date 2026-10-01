import { db } from '@pumpking/database/db';
import createDebug from 'debug';
import type { Request, RequestHandler } from 'express';

const debug = createDebug('ingest:agentApi');

/**
 * piu-spy's calling conventions, which the legacy Python API set and this service keeps:
 * - the arguments are the JSON body merged with the query string (GET requests send a
 *   JSON body too);
 * - agents authenticate with the `agent-name` / `agent-token` headers;
 * - every answer is a 200 with a JSON body; an error is `{"error": "<message>"}`;
 * - lines saying what changed are in the answer's `report`, if there are any.
 */

export type Args = Record<string, unknown>;

export interface Agent {
  id: number;
  name: string;
  title: string;
}

export interface AgentCall {
  args: Args;
  agent: Agent;
  report: string[];
}

const getArgs = (req: Request): Args => {
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  return { ...body, ...req.query };
};

export const getAgent = async (req: Request): Promise<Agent | undefined> => {
  const name = req.header('agent-name');
  const token = req.header('agent-token');
  if (!name || !token) {
    return undefined;
  }
  return db
    .selectFrom('agents')
    .select(['id', 'name', 'title'])
    .where('name', '=', name)
    .where('token', '=', token)
    .executeTakeFirst();
};

// Mandatory arguments, like the legacy `jtools.Extract` (null is a value, missing isn't)
export const requireArg = <T = unknown>(args: Args, name: string): T => {
  if (!(name in args)) {
    throw new Error(`Expected field '${name}' not found`);
  }
  return args[name] as T;
};

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/** A route for agents; `handle` returns the answer's JSON */
export const agentRoute =
  (handle: (call: AgentCall) => Promise<object>): RequestHandler =>
  async (req, res) => {
    try {
      const agent = await getAgent(req);
      if (!agent) {
        throw new Error('permission denied');
      }
      const report: string[] = [];
      const result = await handle({ args: getArgs(req), agent, report });
      res.json(report.length > 0 ? { ...result, report } : result);
    } catch (error) {
      debug(`${req.method} ${req.path} failed`, error);
      res.json({ error: errorMessage(error) });
    }
  };
