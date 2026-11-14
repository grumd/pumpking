import { Context } from './context';
import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { StatusError } from 'utils/errors';

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
    }
    if (error.code !== 'INTERNAL_SERVER_ERROR') {
      // tRPC's own errors keep their status: input validation (Zod) errors are 400, and
      // adminProcedure's UNAUTHORIZED is 401
      return shape;
    }
    return {
      ...shape,
      data: {
        ...shape.data,
        code: 'INTERNAL_SERVER_ERROR',
        httpStatus: 500,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user?.is_admin) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Admin access required' });
  }
  return next({ ctx: { user: ctx.user } });
});

export const devProcedure = t.procedure.use(async ({ next }) => {
  if (process.env.NODE_ENV !== 'development') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Only available in development mode' });
  }
  return next();
});

export const addResultProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user?.can_add_results_manually) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'No access, contact an admin' });
  }
  return next({ ctx: { user: ctx.user } });
});
