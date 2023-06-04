import { fetchJson } from 'legacy-code/utils/fetch';
import queryString from 'query-string';
import _ from 'lodash/fp';

import { HOST } from 'legacy-code/constants/backend';

import { preprocessData } from 'legacy-code/components/SocketTracker/helpers';

const LOADING = `TOP_PER_SONG/LOADING`;
const SUCCESS = `TOP_PER_SONG/SUCCESS`;
const ERROR = `TOP_PER_SONG/ERROR`;

const initialState = {
  isLoading: false,
  data: null,
  error: null,
  fetchingParams: null,
};

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case LOADING:
      return {
        ...state,
        isLoading: true,
        fetchingParams: action.fetchingParams,
        data: null,
        error: null,
      };
    case ERROR:
      return action.fetchingParams === state.fetchingParams
        ? {
            ...state,
            isLoading: false,
            error: action.error,
            data: null,
            fetchingParams: null,
          }
        : state;
    case SUCCESS:
      return action.fetchingParams === state.fetchingParams
        ? {
            ...state,
            isLoading: false,
            data: action.data,
            fetchingParams: null,
          }
        : state;
    default:
      return state;
  }
}

export const fetchTopPerSong = (songName, leftLabel, rightLabel) => {
  const fetchingParams = queryString.stringify({
    song_name: songName,
    charts: _.compact(_.uniq([leftLabel, rightLabel])).join(','),
  });
  return async (dispatch) => {
    dispatch({ type: LOADING, fetchingParams });
    try {
      const data = await dispatch(fetchJson({ url: `${HOST}/topPerSong?${fetchingParams}` }));
      const processedData = _.flow(preprocessData, _.get('results'))(data);
      dispatch({ type: SUCCESS, data: processedData, fetchingParams });
      return processedData;
    } catch (error) {
      dispatch({ type: ERROR, error, fetchingParams });
      return null;
    }
  };
};
