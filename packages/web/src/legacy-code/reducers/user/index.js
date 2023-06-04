import { fetchJson } from 'legacy-code/utils/fetch';

import { HOST } from 'legacy-code/constants/backend';
import { RESET } from './resetAction';

const LOADING = `USER/LOADING`;
const SUCCESS = `USER/SUCCESS`;
const ERROR = `USER/ERROR`;

const initialState = {
  isLoading: false,
  data: null,
};

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case LOADING:
      return {
        ...state,
        isLoading: true,
        data: null,
      };
    case ERROR:
      return {
        ...state,
        isLoading: false,
        error: action.error,
        data: null,
      };
    case SUCCESS:
      return {
        ...state,
        isLoading: false,
        data: action.data,
      };
    case RESET:
      return initialState;
    default:
      return state;
  }
}

export const fetchUser = () => {
  return async (dispatch) => {
    dispatch({ type: LOADING });
    try {
      const data = await dispatch(fetchJson({ url: `${HOST}/profile` }));
      dispatch({ type: SUCCESS, data });
      return data;
    } catch (error) {
      dispatch({ type: ERROR, error });
      return null;
    }
  };
};

export { resetUser } from './resetAction';
