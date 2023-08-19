import { inferAsyncReturnType } from '@trpc/server';
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';

import { db } from 'db';

import createDebug from 'debug';
const debug = createDebug('trpc:context');

export async function createContext({ req }: CreateExpressContextOptions) {
  async function getUserFromHeader() {
    const session = req.headers['session'];
    if (typeof session === 'string') {
      const player = await db
        .selectFrom('sessions')
        .innerJoin('players', 'players.id', 'sessions.player')
        .select([
          'players.nickname',
          'players.id',
          'players.is_admin',
          'players.can_add_results_manually',
        ])
        .where('sessions.id', '=', session)
        .executeTakeFirst();

      if (player) {
        debug(`Authenticated as ${JSON.stringify(player)}`);
        return player;
      }
    }
  }

  return {
    user: await getUserFromHeader(),
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
