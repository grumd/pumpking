import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import 'whatwg-fetch';

import './index.scss';

import App from 'legacy-code/components/App';
import { store } from 'legacy-code/reducers';
import 'legacy-code/utils/polyfills';

import { Language, translation } from 'utils/context/translation';

export const Root = () => {
  return (
    <Language.Provider value={translation}>
      <Provider store={store}>
        <HashRouter>
          <App />
        </HashRouter>
      </Provider>
    </Language.Provider>
  );
};
