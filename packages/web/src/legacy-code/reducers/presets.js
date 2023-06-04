import _ from 'lodash/fp';

import { setFilter } from 'legacy-code/reducers/results';

import { storageKeys, setItem, getItem } from 'legacy-code/utils/storage/versionedStorage';

const SELECT_PRESET = `PRESETS/SELECT_PRESET`;
const LOAD_PRESETS = `PRESETS/LOAD_PRESETS`;
const LOADING_START = `PRESETS/LOADING_START`;
const LOADING_END = `PRESETS/LOADING_END`;

const initialState = {
  presets: [],
  currentPreset: null,
  isLoading: false,
};

const itemToOption = (item) =>
  item && {
    ...item,
    label: item.name,
    value: item.name,
  };

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case LOAD_PRESETS:
      const currentPreset = _.find({ name: _.get('name', state.currentPreset) }, action.presets);
      return {
        ...state,
        currentPreset: itemToOption(currentPreset) || null,
        presets: _.map(itemToOption, action.presets),
      };
    case SELECT_PRESET:
      return {
        ...state,
        currentPreset: itemToOption(action.currentPreset),
      };
    case LOADING_START:
      return {
        ...state,
        isLoading: true,
      };
    case LOADING_END:
      return {
        ...state,
        isLoading: false,
      };
    default:
      return state;
  }
}

const reloadPresets = (presets) => ({ type: LOAD_PRESETS, presets: presets || [] });

const startLoading = () => ({
  type: LOADING_START,
});

const endLoading = () => ({
  type: LOADING_END,
});

export const selectPreset = (currentPreset) => ({
  type: SELECT_PRESET,
  currentPreset,
});

export const loadPresets = () => (dispatch, getState) => {
  dispatch(startLoading());
  return getItem(storageKeys.filterPresets).then((presets) => {
    dispatch(reloadPresets(presets));
    dispatch(endLoading());
  });
};

export const savePreset = (name) => (dispatch, getState) => {
  dispatch(startLoading());
  return getItem(storageKeys.filterPresets).then((presets) => {
    const { filter } = getState().top;
    const newPreset = { name, filter };
    if (!_.some({ name }, presets)) {
      const newPresets = [...(presets || []), newPreset];
      dispatch(reloadPresets(newPresets));
      dispatch(selectPreset(newPreset));
      setItem(storageKeys.filterPresets, newPresets);
    } else if (window.confirm('Preset with this name already exists, replace it?')) {
      const withoutOldPreset = _.remove({ name }, presets);
      const newPresets = [...withoutOldPreset, newPreset];
      dispatch(reloadPresets(newPresets));
      setItem(storageKeys.filterPresets, newPresets);
    }
    dispatch(endLoading());
  });
};

export const openPreset = () => (dispatch, getState) => {
  dispatch(startLoading());
  const currentPreset = getState().presets.currentPreset;
  const name = _.get('name', currentPreset);
  return getItem(storageKeys.filterPresets).then((presets) => {
    const preset = name && _.find({ name }, presets);
    if (preset) {
      dispatch(selectPreset(currentPreset));
      dispatch(setFilter(currentPreset.filter));
    } else {
      // Preset not found for some reason, update list
      dispatch(reloadPresets(presets));
    }
    dispatch(endLoading());
  });
};

export const deletePreset = () => (dispatch, getState) => {
  dispatch(startLoading());
  const name = _.get('name', getState().presets.currentPreset);
  return getItem(storageKeys.filterPresets).then((presets) => {
    const preset = _.find({ name }, presets);
    if (preset && window.confirm('Are you sure you want to delete selected preset?')) {
      const withoutOldPreset = _.remove({ name }, presets);
      dispatch(reloadPresets(withoutOldPreset));
      setItem(storageKeys.filterPresets, withoutOldPreset);
    } else {
      // Preset not found for some reason, update list
      dispatch(reloadPresets(presets));
    }
    dispatch(endLoading());
  });
};
