import _ from 'lodash/fp';
import * as Comlink from 'comlink';
import queryString from 'query-string';

import { HOST } from 'legacy-code/constants/backend';
import { DEBUG } from 'legacy-code/constants/env';

import {
  SUCCESS as RESULTS_SUCCESS,
  PROFILES_UPDATE as RESULTS_PROFILES_UPDATE,
  calculateRankingChanges,
} from 'legacy-code/reducers/results';

// import WorkerChartsProcessing from 'workerize-loader?inline!utils/workers/chartsPostProcess'; // eslint-disable-line import/no-webpack-loader-syntax
import * as chartsProcessing from 'legacy-code/utils/workers/chartsPostProcess';

// import WorkerProfilesProcessing from 'workerize-loader?inline!utils/workers/profilesPostProcess'; // eslint-disable-line import/no-webpack-loader-syntax
import * as profilesProcessing from 'legacy-code/utils/workers/profilesPostProcess';

import { storageKeys, getItem, setItem } from 'legacy-code/utils/storage/versionedStorage';
import { fetchJson } from 'legacy-code/utils/fetch';

import { isModuleWorkerSupported } from 'utils/moduleWorkerSupport';

const resultsUrl = import.meta.env.VITE_SOCKET_MODE ? 'results/best/trusted' : 'results/best';

const CHARTS_LOADING = `CHARTS_LOADING`;
const CHARTS_LOADING_FINISH = `CHARTS_LOADING_FINISH`;
const SET_CHARTS = `SET_CHARTS`;
const RESET_CHARTS = `RESET_CHARTS`;

const initialState = {
  isLoading: false,
  data: null,
  lastUpdatedOn: null,
};

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case CHARTS_LOADING:
      return {
        ...state,
        isLoading: true,
      };
    case CHARTS_LOADING_FINISH:
      return {
        ...state,
        isLoading: false,
      };
    case SET_CHARTS:
      return {
        ...state,
        data: action.data,
        lastUpdatedOn: action.lastUpdatedOn,
      };
    case RESET_CHARTS:
      return initialState;
    default:
      return state;
  }
}

export const setChartsData = (data, lastUpdatedOn) => ({
  type: SET_CHARTS,
  data,
  lastUpdatedOn,
});
export const startLoadingCharts = () => ({
  type: CHARTS_LOADING,
});
export const endLoadingCharts = () => ({
  type: CHARTS_LOADING_FINISH,
});

export const setAndCacheData = (data, lastUpdatedOn) => (dispatch, getState) => {
  setItem(storageKeys.results, { data, lastUpdatedOn });
  dispatch(setChartsData(data, lastUpdatedOn));
};

export const resetChartsData = () => ({
  type: RESET_CHARTS,
});

export const loadCachedData = () => async (dispatch, getState) => {
  const cache = await getItem(storageKeys.results);
  if (cache) {
    console.log('Found cached data from', cache.lastUpdatedOn);
    dispatch(setChartsData(cache.data, cache.lastUpdatedOn));
  }
};

export const fetchChartsData = () => async (dispatch, getState) => {
  dispatch(startLoadingCharts());

  if (!getState().charts.data) {
    // Check if we have any cached data
    performance.mark('cache_start');
    await dispatch(loadCachedData());
    performance.measure('time spent on getting cached data', 'cache_start');
  }

  const { data: cachedData, lastUpdatedOn } = getState().charts;
  const queryParams = lastUpdatedOn ? '?' + queryString.stringify({ since: lastUpdatedOn }) : '';
  const url = `${HOST}/${resultsUrl}${queryParams}`;
  performance.measure('time from page open to requesting /results/best');
  performance.mark('request_start');
  const { charts: fetchedData, lastUpdatedAt: newLastUpdated } = await dispatch(fetchJson({ url }));
  performance.measure('time spent on requesting /results/best', 'request_start');
  const newData = {
    ...(cachedData || {}),
    ...fetchedData,
  };

  await dispatch(setAndCacheData(newData, newLastUpdated));
};

export const postChartsProcessing = () => async (dispatch, getState) => {
  const players = getState().players.data;
  const data = getState().charts.data;
  performance.mark('process_start');

  let processedChartsData = {};
  const isSupported = isModuleWorkerSupported();
  if (isSupported) {
    const processChartsData = Comlink.wrap(
      new Worker(new URL('../utils/workers/chartsPostProcess.js', import.meta.url), {
        type: 'module',
      })
    );
    processedChartsData = await processChartsData(data, players);
  } else {
    processedChartsData = chartsProcessing.processChartsData(data, players);
  }
  const { profiles, sharedCharts /* battles */ } = processedChartsData;
  performance.measure('time spent building charts with results', 'process_start');

  performance.mark('display_start');

  dispatch({
    type: RESULTS_SUCCESS,
    data: _.values(sharedCharts),
    players: _.flow(
      _.toPairs,
      _.map(([id, player]) => ({ ...player, id: _.toInteger(id) }))
    )(players),
    profiles,
    sharedCharts,
  });

  dispatch(endLoadingCharts());

  performance.measure('time spent rendering charts', 'display_start');
  performance.measure('time from page open to displaying first data');

  // Parallelized calculation of ELO and profile data
  const { tracklist } = getState();
  const input = { sharedCharts, profiles, tracklist, /* battles, */ debug: DEBUG };

  performance.mark('elo_calc_start');
  let output;
  if (isSupported) {
    const getProcessedProfiles = Comlink.wrap(
      new Worker(new URL('../utils/workers/profilesPostProcess.js', import.meta.url), {
        type: 'module',
      })
    );
    output = await getProcessedProfiles(input);
  } else {
    output = profilesProcessing.getProcessedProfiles(input);
  }
  performance.measure('time spent calculating elo/pp and graphs for profiles', 'elo_calc_start');

  DEBUG && console.log(output.logText);
  DEBUG &&
    console.log(
      'Processed profiles:',
      Object.values(output.profiles)
        .filter((q) => q.pp)
        .sort((a, b) => b.pp - a.pp)
    );
  performance.mark('display2_start');
  dispatch({
    type: RESULTS_PROFILES_UPDATE,
    ...output,
  });
  dispatch(calculateRankingChanges(output.profiles));
  performance.measure('time spent rendering update with elo/pp', 'display2_start');
  performance.measure('time from page open to displaying everything');

  console.log(
    performance
      .getEntriesByType('measure')
      .map((x) => `${x.name}: ${x.duration} ms`)
      .join('\n')
  );
  performance.clearMarks();
  performance.clearMeasures();
};
