import { Badge, MantineProvider, Switch, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryClientProvider } from '@tanstack/react-query';
import { HashRouter } from 'react-router-dom';

import Root from 'features/root/Root';

import { Language, translation } from 'utils/context/translation';
import { queryClient } from 'utils/trpc';

const theme = createTheme({
  autoContrast: true,
  primaryColor: 'gray',
  spacing: {
    xxs: '0.25rem',
    xs: '0.625rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.25rem',
    xl: '2rem',
  },
  components: {
    Badge: Badge.extend({
      defaultProps: {
        pl: '0.5em',
        pr: '0.5em',
        radius: 'sm',
      },
    }),
    Switch: Switch.extend({
      defaultProps: {
        withThumbIndicator: false,
        color: 'teal',
      },
    }),
  },
});

function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
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
