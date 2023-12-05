import { createContext } from './context';
import { charts } from './routes/charts';
import { players } from './routes/players';
import { results } from './routes/results';
import { user } from './routes/user';
import { router } from './trpc';
import type { inferRouterOutputs } from '@trpc/server';
import { createExpressMiddleware } from '@trpc/server/adapters/express';

const appRouter = router({
  user,
  players,
  charts,
  results,
});

export const expressRouter = createExpressMiddleware({
  router: appRouter,
  createContext,
});

// Export router TYPE for use on front-end
export type AppRouter = typeof appRouter;

export type ApiOutputs = inferRouterOutputs<AppRouter>;
