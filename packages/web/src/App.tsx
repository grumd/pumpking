import { Badge, MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import cookies from 'browser-cookies';
import { useState } from 'react';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';

import LegacyApp from 'legacy-code/components/App';
import { store } from 'legacy-code/reducers';

import { Language, translation } from 'utils/context/translation';
import { api } from 'utils/trpc';

const theme = createTheme({
  autoContrast: true,
  primaryColor: 'gray',
  components: {
    Badge: Badge.extend({
      defaultProps: {
        pl: '0.5em',
        pr: '0.5em',
        radius: 'sm',
      },
    }),
  },
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
            <Language.Provider value={translation}>
              <Provider store={store}>
                <HashRouter>
                  <LegacyApp />
                </HashRouter>
              </Provider>
            </Language.Provider>
          </QueryClientProvider>
        </api.Provider>
      </GoogleOAuthProvider>
    </MantineProvider>
  );
}

export default App;
