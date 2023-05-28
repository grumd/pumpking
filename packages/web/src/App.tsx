import './App.css';

import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { LoginScreen } from 'pages/login/Login';
import { useState } from 'react';
import { api } from 'utils/trpc';

const Test = () => {
  const { data, isLoading } = api.profile.useQuery();

  if (!isLoading && !data) {
    return <LoginScreen />;
  }

  return (
    <div>
      <h1>Profile</h1>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <pre>
          <code>{JSON.stringify(data, null, 4)}</code>
        </pre>
      )}
    </div>
  );
};

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
      links: [httpBatchLink({ url: `${import.meta.env.VITE_API_BASE_PATH}/trpc` })],
    })
  );

  return (
    <GoogleOAuthProvider clientId="197132042723-cmibep21qf6dald9l2l01rif7l5dtd4s.apps.googleusercontent.com">
      <api.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <Test />
        </QueryClientProvider>
      </api.Provider>
    </GoogleOAuthProvider>
  );
}

export default App;
