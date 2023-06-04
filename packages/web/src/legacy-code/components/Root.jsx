import 'whatwg-fetch';
import 'legacy-code/utils/polyfills';

import { HashRouter } from 'react-router-dom';
import { Provider } from 'react-redux';

import './index.scss';

import { Language, browserLanguage } from 'legacy-code/utils/context/translation';

import App from 'legacy-code/components/App';

import { store } from 'legacy-code/reducers';

export const Root = () => {
  return (
    <Language.Provider value={browserLanguage}>
      <Provider store={store}>
        <HashRouter>
          <App />
        </HashRouter>
      </Provider>
    </Language.Provider>
  );
};
