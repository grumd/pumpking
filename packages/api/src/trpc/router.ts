import { createContext } from './context';
import { admin } from './routes/admin';
import { auth } from './routes/auth';
import { charts } from './routes/charts';
import { players } from './routes/players';
import { results } from './routes/results';
import { tracks } from './routes/tracks';
import { user } from './routes/user';
import { router } from './trpc';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { createExpressMiddleware } from '@trpc/server/adapters/express';

const appRouter = router({
  admin,
  auth,
  user,
  players,
  charts,
  results,
  tracks,
});

export const expressRouter = createExpressMiddleware({
  router: appRouter,
  createContext,
});

// Export router TYPE for use on front-end
export type AppRouter = typeof appRouter;

export type ApiInputs = inferRouterInputs<AppRouter>;
export type ApiOutputs = inferRouterOutputs<AppRouter>;
