import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryClientProvider } from '@tanstack/react-query';
import { HashRouter } from 'react-router-dom';

import Root from 'features/root/Root';

import { cssVariablesResolver } from 'theme/cssVariables';
import 'theme/global.css';
import { theme } from 'theme/theme';

import { Language, translation } from 'utils/context/translation';
import { queryClient } from 'utils/trpc';

function App() {
  return (
    <MantineProvider
      theme={theme}
      cssVariablesResolver={cssVariablesResolver}
      defaultColorScheme="dark"
    >
      <Notifications position="bottom-right" />
      <GoogleOAuthProvider clientId="197132042723-cmibep21qf6dald9l2l01rif7l5dtd4s.apps.googleusercontent.com">
        <QueryClientProvider client={queryClient}>
          <Language.Provider value={translation}>
            <HashRouter>
              <Root />
            </HashRouter>
          </Language.Provider>
        </QueryClientProvider>
      </GoogleOAuthProvider>
    </MantineProvider>
  );
}

export default App;
