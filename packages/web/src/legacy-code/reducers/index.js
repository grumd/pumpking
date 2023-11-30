import _ from 'lodash/fp';
import { applyMiddleware, combineReducers, compose, createStore } from 'redux';
import thunk from 'redux-thunk';

import charts from 'legacy-code/reducers/charts';
import login from 'legacy-code/reducers/login';
import players from 'legacy-code/reducers/players';
import popups from 'legacy-code/reducers/popups';
import presets from 'legacy-code/reducers/presets';
import profiles from 'legacy-code/reducers/profiles';
import results from 'legacy-code/reducers/results';
import topPerSong from 'legacy-code/reducers/topPerSong';
import tournament from 'legacy-code/reducers/tournament';
import trackStats from 'legacy-code/reducers/trackStats';
import tracklist from 'legacy-code/reducers/tracklist';
import user from 'legacy-code/reducers/user';

const rootReducer = combineReducers({
  charts,
  login,
  players,
  popups,
  presets,
  profiles,
  results,
  topPerSong,
  tournament,
  tracklist,
  trackStats,
  user,
});

const stateSanitizer = (x) => {
  if (_.isArray(x)) {
    return x.length > 20 ? [{ length: x.length }, ...x.slice(0, 20)] : x;
  }
  if (_.isPlainObject(x)) {
    const keys = _.keys(x);
    if (keys.length > 20) {
      return keys.slice(0, 20).reduce((acc, key) => {
        acc[key] = stateSanitizer(x[key]);
        return acc;
      }, {});
    } else {
      return _.mapValues(stateSanitizer, x);
    }
  }
  return x;
};

export const store = createStore(
  rootReducer,
  window.__REDUX_DEVTOOLS_EXTENSION__ && import.meta.env.DEV
    ? compose(
        applyMiddleware(thunk),
        window.__REDUX_DEVTOOLS_EXTENSION__({
          stateSanitizer,
          // ({
          //   ...state,
          //   charts: {
          //     ...state.charts,
          //     data: `big object`,
          //   },
          //   results: {
          //     ...state.results,
          //     data: `big array`,
          //     results: `big array`,
          //     sharedCharts: 'big object',
          //     originalData: 'big object',
          //     resultInfo: 'big object',
          //     profiles: `big object`,
          //   },
          // }),
        })
      )
    : applyMiddleware(thunk)
);
