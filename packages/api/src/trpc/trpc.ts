import { Context } from './context';
import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { StatusError } from 'utils/errors';

/**
 * Map HTTP status codes to tRPC error codes
 */
const statusToTrpcCode: Record<number, TRPCError['code']> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  408: 'TIMEOUT',
  409: 'CONFLICT',
  412: 'PRECONDITION_FAILED',
  413: 'PAYLOAD_TOO_LARGE',
  405: 'METHOD_NOT_SUPPORTED',
  422: 'UNPROCESSABLE_CONTENT',
  429: 'TOO_MANY_REQUESTS',
  499: 'CLIENT_CLOSED_REQUEST',
};

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    if (error.cause instanceof StatusError) {
      return {
        ...shape,
        data: {
          ...shape.data,
          code: statusToTrpcCode[error.cause.status] || 'INTERNAL_SERVER_ERROR',
          httpStatus: error.cause.status,
        },
      };
    } else {
      return {
        ...shape,
        data: {
          ...shape.data,
          code: 'INTERNAL_SERVER_ERROR',
          httpStatus: 500,
        },
      };
    }
  },
});

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Admin procedure - requires user to be logged in and have is_admin=1
 */
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user?.is_admin) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Admin access required' });
  }
  return next({ ctx: { user: ctx.user } });
});

/**
 * Dev procedure - only available in development mode
 */
export const devProcedure = t.procedure.use(async ({ next }) => {
  if (process.env.NODE_ENV !== 'development') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Only available in development mode' });
  }
  return next();
});
