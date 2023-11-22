import { useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import cookies from 'browser-cookies';

import '@mantine/core/styles.css';
import { MantineProvider, createTheme } from '@mantine/core';

import { api } from 'utils/trpc';

import { Root } from 'legacy-code/components/Root';

const theme = createTheme({
  scale: 1.5,
  primaryColor: 'gray',
});

function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        httpBatchLink({
          url: `${import.meta.env.VITE_API_BASE_PATH}/trpc`,
          async headers() {
            return {
              session: cookies.get('session') ?? undefined,
            };
          },
        }),
      ],
    })
  );

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <GoogleOAuthProvider clientId="197132042723-cmibep21qf6dald9l2l01rif7l5dtd4s.apps.googleusercontent.com">
        <api.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <Root />
          </QueryClientProvider>
        </api.Provider>
      </GoogleOAuthProvider>
    </MantineProvider>
  );
}

export default App;
