import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/api/trpc/router';

type Api = ReturnType<typeof createTRPCReact<AppRouter>>;

export const api: Api = createTRPCReact<AppRouter>();
