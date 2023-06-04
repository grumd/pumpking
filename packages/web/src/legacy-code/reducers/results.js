import _ from 'lodash/fp';
import * as Comlink from 'comlink';
import queryString from 'query-string';

import { fetchJson } from 'legacy-code/utils/fetch';
import {
  labelToTypeLevel,
  gradeComparator,
  mapResult,
  initializeProfile,
  getProfileInfoFromResult,
  getMaxRawScore,
} from 'legacy-code/utils/leaderboards';

// import WorkerProfilesProcessing from 'workerize-loader?inline!utils/workers/profilesPostProcess'; // eslint-disable-line import/no-webpack-loader-syntax
import * as profilesProcessing from 'legacy-code/utils/workers/profilesPostProcess';
import { storageKeys, setItem, getItem } from 'legacy-code/utils/storage/versionedStorage';

import { HOST } from 'legacy-code/constants/backend';
import { DEBUG } from 'legacy-code/constants/env';
import { RANK_FILTER } from 'legacy-code/constants/leaderboard';

import { isModuleWorkerSupported } from 'utils/moduleWorkerSupport';

const LOADING = `TOP/LOADING`;
const STOP_LOADING = `TOP/STOP_LOADING`;
export const SUCCESS = `TOP/SUCCESS`;
const ERROR = `TOP/ERROR`;
const SET_FILTER = `TOP/SET_FILTER`;
const RESET_FILTER = `TOP/RESET_FILTER`;
const RANKING_CHANGE_SET = `TOP/RANKING_CHANGE_SET`;
export const PROFILES_UPDATE = `TOP/PROFILES_UPDATE`;

const highscoresUrl = import.meta.env.VITE_SOCKET_MODE
  ? 'results/highscores/trusted'
  : 'results/highscores';

export const defaultFilter = {
  rank: RANK_FILTER.SHOW_ALL,
};

const initialState = {
  isLoading: false,
  isLoadingRanking: false,
  data: [],
  filter: defaultFilter,
  players: {},
  profiles: {},
  results: [],
  resultInfo: {},
  sharedCharts: {},
};

const processData = (data) => {
  const { players, results, shared_charts } = data;

  //// Initialization
  // Init for TOP
  const mappedResults = [];
  const getTopResultId = (result) => `${result.sharedChartId}-${result.playerId}-${result.isRank}`;
  const getBestGradeResultId = (result) => `${result.sharedChartId}-${result.playerId}`;
  const topResults = {}; // Temp object
  const bestGradeResults = {}; // Temp object
  const top = {}; // Main top scores pbject

  // Profiles for every player
  let profiles = {};

  // Loop 1
  for (let resRaw of results) {
    if (!players[resRaw.player]) {
      // Player of this result was not found in list of players. Ignoring this result like it doesn't exist
      continue;
    }

    const sharedChartId = resRaw.shared_chart;
    // Initialize Song
    if (!top[sharedChartId]) {
      const sharedChart = shared_charts[sharedChartId];
      const label = _.toUpper(sharedChart.chart_label);
      const [chartType, chartLevel] = labelToTypeLevel(label);
      top[sharedChartId] = {
        song: sharedChart.track_name,
        chartLabel: label,
        chartLevel,
        chartType,
        difficulty: sharedChart.difficulty,
        duration: sharedChart.duration,
        sharedChartId: sharedChartId,
        maxTotalSteps: sharedChart.max_total_steps,
        results: [],
        allResultsIds: [],
      };
    }

    // Getting current chart and result (mapped)
    const chartTop = top[sharedChartId];
    const result = mapResult(resRaw, players, chartTop);
    mappedResults.push(result);

    // Inserting result into TOP
    const topResultId = getTopResultId(result);
    const currentTopResult = topResults[topResultId];
    if (!currentTopResult || currentTopResult.score < result.score) {
      if (currentTopResult) {
        const oldScoreIndex = chartTop.results.indexOf(currentTopResult);
        if (oldScoreIndex !== -1) {
          chartTop.results.splice(oldScoreIndex, 1);
        }
      }
      const newScoreIndex = _.sortedLastIndexBy((r) => -r.score, result, chartTop.results);
      if (!result.isUnknownPlayer || newScoreIndex === 0) {
        chartTop.results.splice(newScoreIndex, 0, result);
        chartTop.latestScoreDate = result.date;
        chartTop.allResultsIds.push(result.playerId);
        topResults[topResultId] = result;
      }
    }

    // Getting best grade of player on this chart
    if (!result.isIntermediateResult) {
      const bestGradeResultId = getBestGradeResultId(result);
      const currentBestGradeRes = bestGradeResults[bestGradeResultId];
      if (
        !currentBestGradeRes ||
        gradeComparator[currentBestGradeRes.grade] <= gradeComparator[result.grade]
      ) {
        // Using <= here, so newer scores always win and rewrite old scores
        currentBestGradeRes && (currentBestGradeRes.isBestGradeOnChart = false);
        result.isBestGradeOnChart = true;
        bestGradeResults[bestGradeResultId] = result;
      }
    }
  }

  // Loop 2, when the TOP is already set up
  for (let chartId in top) {
    const chart = top[chartId];
    chart.maxScore = null;
    for (let result of chart.results) {
      if (!result.isRank) {
        if (result.accuracy) {
          const maxScoreCandidate = getMaxRawScore(result, chart);
          if (chart.maxScore < maxScoreCandidate) {
            chart.maxScore = maxScoreCandidate;
          }
        } else if (chart.maxScore && chart.maxScore < result.score) {
          chart.maxScore = result.score;
        }
      }
      // Getting some info about players
      if (!result.isUnknownPlayer && !result.isIntermediateResult) {
        if (!profiles[result.playerId]) {
          initializeProfile(result, profiles, players);
        }
        getProfileInfoFromResult(result, chart, profiles);
      }
    }
  }

  return { mappedResults, profiles, sharedCharts: top };
};

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case LOADING:
      return {
        ...state,
        isLoading: true,
      };
    case STOP_LOADING:
      return {
        ...state,
        isLoading: false,
      };
    case ERROR:
      return {
        ...state,
        isLoading: false,
        error: action.error,
        data: initialState.data,
        players: initialState.players,
        profiles: initialState.profiles,
        results: initialState.results,
        sharedCharts: initialState.sharedCharts,
        scoreInfo: {},
      };
    case SUCCESS:
      return {
        ...state,
        isLoading: false,
        isLoadingRanking: true,
        data: action.data,
        players: action.players,
        profiles: action.profiles,
        results: action.results,
        sharedCharts: action.sharedCharts,
        originalData: action.originalData,
        scoreInfo: {},
      };
    case PROFILES_UPDATE:
      return {
        ...state,
        isLoadingRanking: false,
        profiles: action.profiles,
        resultInfo: action.resultInfo,
        sharedCharts: action.sharedCharts,
        data: _.values(action.sharedCharts),
      };
    case SET_FILTER:
      return {
        ...state,
        filter: action.filter,
      };
    case RESET_FILTER:
      return {
        ...state,
        filter: defaultFilter,
      };
    case RANKING_CHANGE_SET:
      return {
        ...state,
        profiles: _.mapValues((playerOriginal) => {
          const player = {
            ...playerOriginal,
            prevRating: _.get(playerOriginal.id, action.rankingsPointsMap),
          };
          if (_.isEmpty(action.listPrev)) {
            return player; // First time opening this thing and we didn't have any previous data
          }
          if (!_.includes(player.id, action.listPrev)) {
            return { ...player, change: 'NEW' };
          } else if (!_.includes(player.id, action.listNow)) {
            // Should NEVER happen, idk if this is possible
            return { ...player, change: '?' };
          } else {
            return {
              ...player,
              change: _.indexOf(player.id, action.listPrev) - _.indexOf(player.id, action.listNow),
            };
          }
        }, state.profiles),
      };
    default:
      return state;
  }
}

export const fetchResults = () => {
  return async (dispatch, getState) => {
    dispatch({ type: LOADING });
    try {
      const data = await dispatch(
        fetchJson({
          url: `${HOST}/${highscoresUrl}`,
        })
      );

      if (data.error) {
        throw new Error(data.error);
      }
      // HACKS for test
      // data.results = _.dropRight(500, data.results);
      // data.results = _.dropRight(9500, data.results);
      // console.log(1, data.results);
      // data.results = _.filter((res) => res.gained < '2020-07-05 00:00:00', data.results);
      // data.results = _.filter(res => res.gained < '2020-03-12 16:55:00', data.results);
      // data.results = _.filter(res => res.gained < '2020-03-12 16:34:51', data.results);
      // console.log(2, data.results);

      dispatch(processResultsData(data));
    } catch (error) {
      console.log(error);
      dispatch({ type: ERROR, error });
    }
  };
};

export const appendNewResults = (lastDate) => {
  return async (dispatch, getState) => {
    const { originalData, sharedCharts } = getState().results;
    if (!lastDate) {
      return dispatch(fetchResults());
    }

    dispatch({ type: LOADING });
    try {
      const data = await dispatch(
        fetchJson({
          url: `${HOST}/${highscoresUrl}?${queryString.stringify({ start_date: lastDate })}`,
        })
      );
      if (data.error) {
        throw new Error(data.error);
      }

      const appendedResults = _.filter((result) => {
        const currentResults = sharedCharts[result.shared_chart];
        if (!currentResults) {
          return true;
        }
        const oldResult = _.find(
          (old) =>
            old.id === result.id ||
            (old.playerId === result.player && old.isRank === !!result.rank_mode),
          currentResults.results
        );
        if (!oldResult) {
          if (result.player === 1 && currentResults.results[0].score > result.score) {
            return false;
          }
          return true;
        }
        if (oldResult.id === result.id || oldResult.score >= result.score) {
          return false;
        }
        return true;
      }, data.results);

      console.log('Received results:', data, '; Will append:', appendedResults);

      if (!_.isEmpty(appendedResults)) {
        const mergedData = {
          players: data.players,
          results: [...originalData.results, ...appendedResults],
          shared_charts: { ...originalData.shared_charts, ...data.shared_charts },
        };
        dispatch(processResultsData(mergedData));
      } else {
        dispatch({ type: STOP_LOADING });
      }
    } catch (error) {
      console.log(error);
      dispatch({ type: ERROR, error });
    }
  };
};

const processResultsData = (data) => {
  return async (dispatch, getState) => {
    const { tracklist } = getState();
    const { sharedCharts, mappedResults, profiles } = processData(data, tracklist);

    dispatch({
      type: SUCCESS,
      data: _.values(sharedCharts),
      players: _.flow(
        _.toPairs,
        _.map(([id, player]) => ({ ...player, id: _.toInteger(id) }))
      )(data.players),
      results: mappedResults,
      profiles,
      sharedCharts,
      originalData: data,
    });

    // Parallelized calculation of ELO and profile data
    const input = { sharedCharts, profiles, tracklist, debug: DEBUG };
    let output;
    if (isModuleWorkerSupported()) {
      const getProcessedProfiles = Comlink.wrap(
        new Worker(new URL('../utils/workers/profilesPostProcess.js', import.meta.url), {
          type: 'module',
        })
      );
      output = await getProcessedProfiles(input);
    } else {
      output = profilesProcessing.getProcessedProfiles(input);
    }

    DEBUG && console.log(output.logText);
    DEBUG &&
      console.log(
        'Processed profiles:',
        Object.values(output.profiles)
          .filter((q) => q.pp)
          .sort((a, b) => b.pp - a.pp)
      );
    // console.log(output.sharedCharts);
    // let byLevel = _.groupBy((ch) => ch.chartLevel, _.values(output.sharedCharts));
    // function getSD(array) {
    //   const n = array.length;
    //   const mean = array.reduce((a, b) => a + b) / n;
    //   return Math.sqrt(array.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);
    // }
    // byLevel = _.mapValues((charts) => {
    //   return {
    //     avgLevel: _.meanBy((ch) => ch.interpolatedDifficulty || Number(ch.chartLevel), charts),
    //     deviation: getSD(charts.map((ch) => ch.interpolatedDifficulty || Number(ch.chartLevel))),
    //     charts,
    //   };
    // }, byLevel);
    // console.log(byLevel);
    // console.log(
    //   _.values(byLevel)
    //     .map((q) => `${q.avgLevel}\t${q.deviation}`)
    //     .join('\n')
    // );
    dispatch({
      type: PROFILES_UPDATE,
      ...output,
    });
    dispatch(calculateRankingChanges(output.profiles));
  };
};

export const setFilter = (filter) => ({
  type: SET_FILTER,
  filter,
});

export const resetFilter = () => ({
  type: RESET_FILTER,
});

const getListOfNames = _.map('id');
const getMapOfRatings = _.flow(
  // tmp migration fix
  _.map((q) => [q.id, typeof q.pp === 'number' ? q.pp : q.pp.pp]),
  _.fromPairs
);

export const calculateRankingChanges = (profiles) => {
  return async (dispatch, getState) => {
    try {
      const mappedProfiles = Object.values(profiles).map((profile) => ({
        pp: profile.pp,
        id: profile.id,
      }));
      const ranking = _.orderBy('[pp]', 'desc', mappedProfiles);
      const [lastChangedRanking, lastChangedRankingPoints, lastFetchedRanking] = await Promise.all([
        getItem(storageKeys.lastChangedRanking),
        getItem(storageKeys.lastChangedRankingPoints),
        getItem(storageKeys.lastFetchedRanking),
      ]);
      const listNow = getListOfNames(ranking);
      const listLastFetched = getListOfNames(lastFetchedRanking);
      const listLastChanged = getListOfNames(lastChangedRanking);
      const mapPointsNow = getMapOfRatings(ranking);
      const mapPointsLastFetched = getMapOfRatings(lastFetchedRanking);
      const mapPointsLastChanged = getMapOfRatings(lastChangedRankingPoints);

      let rankingsPointsMap = mapPointsLastChanged;
      // console.log(listNow, listLastFetched, listLastChanged);
      if (!_.isEqual(mapPointsNow, mapPointsLastFetched)) {
        // Between this fetch and last fetch there was a CHANGE in ranking
        setItem(storageKeys.lastChangedRankingPoints, lastFetchedRanking);
        rankingsPointsMap = mapPointsLastFetched;
      }
      let listPrev = listLastChanged;
      if (!_.isEqual(listNow, listLastFetched)) {
        // Between this fetch and last fetch there was a CHANGE in ranking
        setItem(storageKeys.lastChangedRanking, lastFetchedRanking);
        listPrev = listLastFetched;
      }
      dispatch({
        type: RANKING_CHANGE_SET,
        listNow,
        listPrev,
        rankingsPointsMap,
      });
      setItem(storageKeys.lastFetchedRanking, ranking);
    } catch (error) {
      console.warn('Cannot get ranking from local storage', error);
    }
  };
};
