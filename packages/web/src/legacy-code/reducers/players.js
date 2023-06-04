import { fetchJson } from 'legacy-code/utils/fetch';

import { HOST } from 'legacy-code/constants/backend';

const LOADING = `PLAYERS/LOADING`;
const SUCCESS = `PLAYERS/SUCCESS`;
const ERROR = `PLAYERS/ERROR`;

const initialState = {
  isLoading: false,
  data: null,
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

export const fetchPlayers = () => {
  return async (dispatch) => {
    dispatch({ type: LOADING });
    try {
      const data = await dispatch(fetchJson({ url: `${HOST}/players` }));
      dispatch({ type: SUCCESS, data: data.players });
      return data.players;
    } catch (error) {
      dispatch({ type: ERROR, error });
      return null;
    }
  };
};
