import localForage from 'localforage';

export const storageKeys = {
  results: 'results',
  filter: 'filter',
  filterPresets: 'filterPresets',
  lastChangedRanking: 'lastChangedRanking',
  lastChangedRankingPoints: 'lastChangedRankingPoints',
  lastFetchedRanking: 'lastFetchedRanking',
};

const versions = {
  [storageKeys.results]: 1,
  [storageKeys.filter]: 1,
  [storageKeys.filterPresets]: 1,
  [storageKeys.lastChangedRanking]: 1,
  [storageKeys.lastChangedRankingPoints]: 1,
  [storageKeys.lastFetchedRanking]: 1,
};

const checkVersion = async (key) => {
  const versionKey = `${key}_version`;
  const version = await localForage.getItem(versionKey);
  if (version !== versions[key]) {
    await localForage.removeItem(key);
    await localForage.setItem(versionKey, versions[key]);
  }
};

export const getItem = async (key) => {
  await checkVersion(key);
  return localForage.getItem(key);
};

export const setItem = async (key, value) => {
  await checkVersion(key);
  return localForage.setItem(key, value);
};
