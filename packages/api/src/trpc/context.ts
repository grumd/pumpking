import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { db } from 'db';
import createDebug from 'debug';

const debug = createDebug('trpc:context');

export async function createContext({ req }: CreateExpressContextOptions) {
  const sessionId = typeof req.headers['session'] === 'string' ? req.headers['session'] : null;

  async function getUserFromHeader() {
    if (sessionId) {
      const player = await db
        .selectFrom('sessions')
        .innerJoin('players', 'players.id', 'sessions.player')
        .select([
          'players.nickname',
          'players.id',
          'players.is_admin',
          'players.can_add_results_manually',
          'players.preferences',
          'players.region',
        ])
        .where('sessions.id', '=', sessionId)
        .executeTakeFirst();

      if (player) {
        debug(`Authenticated as ${JSON.stringify(player)}`);
        return player;
      }
    }
  }

  return {
    user: await getUserFromHeader(),
    sessionId,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
