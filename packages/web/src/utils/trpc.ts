import type { AppRouter } from '@/api/trpc/router';
import { QueryClient } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { type TRPCOptionsProxy, createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import cookies from 'browser-cookies';
import superjson from 'superjson';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${import.meta.env.VITE_API_BASE_PATH}/trpc`,
      async headers() {
        return {
          session: cookies.get('session') ?? undefined,
        };
      },
      transformer: superjson,
    }),
  ],
});

export const api: TRPCOptionsProxy<AppRouter> = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});
