import _ from 'lodash/fp';

const ADD_POPUP = `POPUPS/ADD`;
const REMOVE_POPUP = `POPUPS/REMOVE`;

const ID_PREFIX = 'popup';

const initialState = {
  popups: [],
};

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case ADD_POPUP:
      const id = _.uniqueId(ID_PREFIX);
      return {
        ...state,
        popups: [
          ...state.popups,
          {
            id,
            type: action.popupType,
            ..._.pick(['parameters', 'fadeIn', 'fadeOut', 'timeout', 'persistent'], action),
          },
        ],
      };
    case REMOVE_POPUP:
      return {
        ...state,
        popups: _.remove({ id: action.id }, state.popups),
      };
    default:
      return state;
  }
}

export const addPopup = ({ type, parameters, fadeIn, fadeOut, timeout, persistent }) => {
  return { type: ADD_POPUP, popupType: type, parameters, fadeIn, fadeOut, timeout, persistent };
};

export const removePopup = ({ id }) => {
  return { type: REMOVE_POPUP, id };
};
