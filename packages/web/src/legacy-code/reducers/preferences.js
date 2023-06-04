import _ from 'lodash/fp';

import { fetchJson, postJson } from 'legacy-code/utils/fetch';

import { HOST } from 'legacy-code/constants/backend';

const LOADING = `PREFERENCES/LOADING`;
const SUCCESS = `PREFERENCES/SUCCESS`;
const ERROR = `PREFERENCES/ERROR`;
// const UPDATE_LOADING = `PREFERENCES/UPDATE/LOADING`;
// const UPDATE_SUCCESS = `PREFERENCES/UPDATE/SUCCESS`;
// const UPDATE_ERROR = `PREFERENCES/UPDATE/ERROR`;
const CHANGE = `PREFERENCES/CHANGE`;

const defaultPreferences = {
  playersHiddenStatus: {},
};

const initialState = {
  isLoading: false,
  data: defaultPreferences,
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
        data: defaultPreferences,
      };
    case SUCCESS:
      return {
        ...state,
        isLoading: false,
        data: _.merge(defaultPreferences, action.data),
      };
    case CHANGE:
      return {
        data: action.data,
      };
    default:
      return state;
  }
}

export const fetchPreferences = () => {
  return async (dispatch) => {
    dispatch({ type: LOADING });
    try {
      const data = await dispatch(fetchJson({ url: `${HOST}/profile/preferences` }));
      dispatch({ type: SUCCESS, data: data.preferences });
      return data;
    } catch (error) {
      dispatch({ type: ERROR, error });
      return null;
    }
  };
};

export const fetchUserPreferences = (id) => {
  return async (dispatch) => {
    const data = await dispatch(fetchJson({ url: `${HOST}/player/${id}/preferences` }));
    return data;
  };
};

export const updatePreferences = (preferences) => {
  return async (dispatch) => {
    // dispatch({ type: LOADING });
    dispatch({ type: CHANGE, data: preferences });
    try {
      await dispatch(
        postJson({
          url: `${HOST}/profile/preferences`,
          body: { preferences },
        })
      );
      // dispatch({ type: SUCCESS, data: data.preferences });
      // return data.preferences;
    } catch (error) {
      // dispatch({ type: ERROR, error });
      return null;
    }
  };
};
