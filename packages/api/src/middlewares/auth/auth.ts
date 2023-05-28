import { knex } from 'db';
import type { Response, Request, NextFunction } from 'express';

import { StatusError } from 'utils/errors';
import { Session } from 'models/Session';

const debug = require('debug')('backend-ts:middleware:auth');

export const auth = async (request: Request, response: Response, next: NextFunction) => {
  const session = request.headers['session'];

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
      request.user = sessionDb.player;
      debug(`Authenticated as ${JSON.stringify(request.user)}`);
    }
  }

  return next();
};

export const userAuth = async (request: Request, response: Response, next: NextFunction) => {
  if (!request.user) {
    next(new StatusError(401, 'Unauthorized, requires login'));
  } else {
    debug(`User ${request.user?.nickname} granted access`);
    next();
  }
};

export const adminAuth = async (request: Request, response: Response, next: NextFunction) => {
  if (!request.user?.is_admin) {
    next(new StatusError(401, 'Unauthorized, requires Admin access'));
  } else {
    debug(`User ${request.user?.nickname} granted Admin access`);
    next();
  }
};

export const addResultsAuth = async (request: Request, response: Response, next: NextFunction) => {
  if (!request.user?.can_add_results_manually) {
    next(new StatusError(401, 'Unauthorized, requires access to adding results'));
  } else {
    debug(`User ${request.user?.nickname} granted access to adding results`);
    next();
  }
};
