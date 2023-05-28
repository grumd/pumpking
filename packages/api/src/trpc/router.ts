import { router, publicProcedure } from './trpc';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { createContext } from './context';

const appRouter = router({
  profile: publicProcedure.query(async ({ ctx }) => {
    return ctx.user || null;
  }),
});

export const expressRouter = createExpressMiddleware({
  router: appRouter,
  createContext,
});

// Export router TYPE for use on front-end
export type AppRouter = typeof appRouter;
