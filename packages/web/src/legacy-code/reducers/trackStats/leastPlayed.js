import { fetchJson } from 'legacy-code/utils/fetch';

import { HOST } from 'legacy-code/constants/backend';

const LOADING = `LEAST_PLAYED/LOADING`;
const SUCCESS = `LEAST_PLAYED/SUCCESS`;
const ERROR = `LEAST_PLAYED/ERROR`;

const initialState = {
  isLoading: false,
  data: [],
};

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case LOADING:
      return {
        ...state,
        isLoading: true,
      };
    case ERROR:
      return {
        ...state,
        isLoading: false,
        error: action.error,
      };
    case SUCCESS:
      return {
        ...state,
        isLoading: false,
        data: action.data,
      };
    default:
      return state;
  }
}

export const fetchLeastPlayed = () => {
  return async (dispatch) => {
    dispatch({ type: LOADING });
    try {
      const data = await dispatch(fetchJson({ url: `${HOST}/track-stats/most-time-not-played` }));
      dispatch({ type: SUCCESS, data });
      return data;
    } catch (error) {
      dispatch({ type: ERROR, error });
      return null;
    }
  };
};
