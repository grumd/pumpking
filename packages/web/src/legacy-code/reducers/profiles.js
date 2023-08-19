const SET_FILTER = `PROFILES/SET_FILTER`;
const RESET_FILTER = `PROFILES/RESET_FILTER`;

export const defaultFilter = {};

const initialState = {
  isLoading: false,
  filter: defaultFilter,
};

export default function reducer(state = initialState, action) {
  switch (action.type) {
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
    default:
      return state;
  }
}

export const setProfilesFilter = (filter) => ({
  type: SET_FILTER,
  filter,
});

export const resetProfilesFilter = () => ({
  type: RESET_FILTER,
});
