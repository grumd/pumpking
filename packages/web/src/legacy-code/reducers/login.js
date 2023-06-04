import cookies from 'browser-cookies';

import { postJson } from 'legacy-code/utils/fetch';

import { HOST } from 'legacy-code/constants/backend';

import { fetchUser, resetUser } from 'legacy-code/reducers/user';

const LOADING = `LOGIN/LOADING`;
const SUCCESS = `LOGIN/SUCCESS`;
const ERROR = `LOGIN/ERROR`;

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
        data: null,
        error: null,
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
    default:
      return state;
  }
}

export const login = (googleResponse) => {
  return async (dispatch) => {
    dispatch({ type: LOADING });
    try {
      const data = await dispatch(
        postJson({
          url: `${HOST}/login/google`,
          body: { token: googleResponse.tokenId },
        })
      );
      cookies.set('session', data.session, { expires: 30 });
      dispatch({ type: SUCCESS, data });
      dispatch(fetchUser());
      return data;
    } catch (error) {
      dispatch({ type: ERROR, error });
      return null;
    }
  };
};

export const logout = () => {
  return async (dispatch) => {
    dispatch({ type: LOADING });
    dispatch(resetUser());
    try {
      const data = await dispatch(
        postJson({
          url: `${HOST}/logout`,
        })
      );
      dispatch({ type: SUCCESS, data });
      return data;
    } catch (error) {
      dispatch({ type: ERROR, error });
      return null;
    }
  };
};
