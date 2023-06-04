import { fetchJson } from 'legacy-code/utils/fetch';

import { HOST } from 'legacy-code/constants/backend';

const LOADING = `TOURNAMENT/LOADING`;
const SUCCESS = `TOURNAMENT/SUCCESS`;
const ERROR = `TOURNAMENT/ERROR`;

const initialState = {
  isLoading: false,
  data: {},
  error: null,
};

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case LOADING:
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case ERROR:
      return {
        ...state,
        isLoading: false,
        error: action.error,
        data: {},
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

export const fetchCurrentTournament = () => {
  return async (dispatch) => {
    dispatch({ type: LOADING });
    try {
      const data = await dispatch(fetchJson({ url: `${HOST}/tournament/info` }));
      dispatch({ type: SUCCESS, data });
      return data;
    } catch (error) {
      dispatch({ type: ERROR, error });
      return null;
    }
  };
};
