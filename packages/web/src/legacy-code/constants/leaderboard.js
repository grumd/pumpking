import _ from 'lodash/fp';

export const SORT = {
  DEFAULT: 'default',
  PROTAGONIST: 'protagonist',
  PP_ASC: 'ppAsc',
  PP_DESC: 'ppDesc',
  NEW_SCORES_PLAYER: 'newScoresPlayer',
  EASIEST_SONGS: 'easiestSongs',
  HARDEST_SONGS: 'hardestSongs',
};

export const RANK_FILTER = {
  SHOW_ALL: 'SHOW_ALL',
  SHOW_BEST: 'SHOW_BEST',
  SHOW_ONLY_RANK: 'SHOW_ONLY_RANK',
  SHOW_ONLY_NORANK: 'SHOW_ONLY_NORANK',
};

export const CHART_MIN_MAX = [1, 28];
export const DURATION = {
  STD: 'Standard',
  SHORT: 'Short',
  REMIX: 'Remix',
  FULL: 'Full',
};
export const DURATION_DEFAULT = _.values(DURATION);
