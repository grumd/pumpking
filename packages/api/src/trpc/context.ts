import { inferAsyncReturnType } from '@trpc/server';
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { knex } from 'db';
import { Session } from 'models/Session';

const debug = require('debug')('trpc:context');

export async function createContext({ req }: CreateExpressContextOptions) {
  async function getUserFromHeader() {
    const session = req.headers['session'];
    if (typeof session === 'string') {
      const sessionDb = await knex
        .query(Session)
        .select(
          'id',
          'player.nickname',
          'player.id',
          'player.is_admin',
          'player.can_add_results_manually'
        )
        .where('id', session)
        .innerJoinColumn('player')
        .getFirstOrNull();

      if (sessionDb) {
        const user = sessionDb.player;
        debug(`Authenticated as ${JSON.stringify(user)}`);
        return user;
      }
    }
  }

  return {
    user: await getUserFromHeader(),
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
