import { router, publicProcedure } from './trpc';
import { createExpressMiddleware } from '@trpc/server/adapters/express';

import { createContext } from './context';

import { players } from './routes/players';

const appRouter = router({
  user: publicProcedure.query(async ({ ctx }) => {
    return ctx.user || null;
  }),
  players,
});

export const expressRouter = createExpressMiddleware({
  router: appRouter,
  createContext,
});

// Export router TYPE for use on front-end
export type AppRouter = typeof appRouter;
