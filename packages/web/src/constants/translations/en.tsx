export const en = {
  // generic
  NOTHING_FOUND: 'Nothing found',
  ERROR: 'Error',

  // menu
  LEADERBOARDS: 'leaderboards',
  RANKING: 'ranking',
  TOURNAMENTS: 'tournaments',
  SONGS: 'songs',
  LOGOUT: 'logout',

  // Leaderboards buttons
  FILTERS: 'filters',
  SORTING: 'sorting',
  PRESETS: 'presets',
  PRESETS_PLACEHOLDER: 'presets...',
  RESET_FILTERS: 'reset filters',
  REFRESH: 'refresh',
  SEARCH: 'search',
  FILTER_CHARTS: 'charts filter',
  CHARTS: 'charts',
  MIXES_LABEL: 'mixes',
  SONG_NAME_LABEL: 'song name',
  SCORING_LABEL: 'scoring',
  SONG_NAME_PLACEHOLDER: 'song name...',
  PLAYERS_PLACEHOLDER: 'players...',
  ADD_RESULT: 'add result',
  // Sorting
  BY_DATE_DESC: 'by date (new to old)',
  BY_DATE_ASC: 'by date (old to new)',
  BY_DIFFICULTY_ASC: 'by difficulty (easy to hard)',
  BY_DIFFICULTY_DESC: 'by difficulty (hard to easy)',
  BY_PP_DESC: 'by pp (big to small)',
  BY_PP_ASC: 'by pp (small to big)',

  // Presets overlay
  OPEN: 'open',
  OVERWRITE: 'overwrite',
  DELETE: 'delete',
  ADD: 'add',
  SAVE: 'save',
  CANCEL: 'cancel',
  EMPTY: 'empty',
  SHOW_PRESETS_TABS: 'show presets tabs',
  PRESET_NAME_PLACEHOLDER: 'preset name...',

  // Leaderboards Filters
  SHOW_CHARTS_PLAYED_BY: 'show charts played by:',
  EACH_OF_THESE: 'each of these',
  AND_ANY_OF_THESE: 'and any of these',
  AND_NONE_OF_THESE: 'and none of these',
  SHOW_RANK: 'show rank:',
  RANK_FILTER_SHOW_ALL: 'show all scores',
  RANK_FILTER_SHOW_BEST: 'one best score of each player (rank or not)',
  RANK_FILTER_SHOW_RANK: 'rank only',
  RANK_FILTER_SHOW_NORANK: 'without rank only',
  SHOW_HIDDEN_PLAYERS: 'show hidden players',

  // Leaderboards Sorting
  SORTING_LABEL: 'sorting:',
  SORTING_PLACEHOLDER: 'choose sorting',
  PLAYER_LABEL: 'player:',
  EXCLUDE_FROM_COMPARISON: 'exclude from comparison:',

  // Sorting options
  NEW_TO_OLD_SCORES: 'new to old scores',
  NEW_TO_OLD_SCORES_OF_A_PLAYER: 'new to old scores of a player',
  SCORE_DIFFERENCE: 'score difference',
  WORST_TO_BEST_BY_ELO: 'worst to best (elo)',
  BEST_TO_WORST_BY_ELO: 'best to worst (elo)',
  WORST_TO_BEST_BY_PP: 'worst to best (pp)',
  BEST_TO_WORST_BY_PP: 'best to worst (pp)',
  EASY_TO_HARD_CHARTS: 'easy to hard charts',
  HARD_TO_EASY_CHARTS: 'hard to easy charts',

  // Rank options
  SHOW_ALL_SCORES: 'how all scores',
  BEST_SCORE: 'one best score of each player (rank or not)',
  RANK_ONLY: 'rank only',
  ONLY_NO_RANK: 'without rank only',

  // Results
  SHOW_MORE_RESULTS: (count: number) => `(show ${count} more)`,

  // Score details overlay
  PLAYER: 'player',
  EXP: 'exp',
  ELO: 'elo',
  PP: 'pp',
  MODS: 'mods',
  COMBO: 'combo',
  CCAL: 'kcal',
  SCORE_INCREASE: 'increase',
  ORIGINAL_MIX: 'was played on',
  ORIGINAL_CHART: 'original chart:',
  ORIGINAL_SCORE: 'original score:',
  SIGHTREAD: '* sightread',

  // Other
  MY_BEST_SCORE_WARNING: 'captured from best. Not all stats are known',
  BACK_TO_ALL_CHARTS: 'back to all charts',
  NO_RESULTS: 'no results found',
  SHOW_MORE: 'show more',
  HIDDEN: 'hidden',

  // Profile Results by level
  ALL: 'all',
  DOUBLES: 'doubles',
  SINGLES: 'singles',
  UNPLAYED: 'unplayed',
  BACK_BUTTON: 'back',
  LEVEL_PLACEHOLDER: 'level...',

  // played time ago
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  YESTERDAY_NIGHT: 'yesterday at night',
  TIME_AGO: 'ago',
  DAYS_SHORT: 'days',
  WEEKS_SHORT: 'wks',
  MONTHS_SHORT: 'mon',
  NEVER: 'never',

  // Tournaments
  START_DATE: 'Begins:',
  END_DATE: 'Ends:',
  BRACKETS: 'Brackets:',

  HIDE_UNSELECTED: 'hide unselected',
  SHOW_ALL: 'show all',
  RANK: 'rank',
  LAST_TIME_PLAYED: 'last time played',
  COMPARE_WITH: 'compare with',
  GRADES: 'grades',
  LEVELS: 'levels',
  MORE_DETAILS: 'more details',
  ACCURACY_BY_LEVEL: 'accuracy by level',
  LEVEL_ACHIEVEMENTS: 'achievements by level',
  LEVEL_ACHIEVEMENTS_HINT:
    '* to gain an achievement, you should play ~10% of all charts of that level on a specific grade',
  ACHIEVEMENTS: 'achievements',
  MOST_PLAYED_CHARTS: 'most played charts',
  PLACE_IN_TOP: 'place in top',
  TOTAL: 'total',
  UNITE_GRAPHS: 'unite graphs',
  RESULTS: 'Results:',
  TOP_POPULAR_TRACKS: 'Most popular tracks',
  MONTHLY_TOP_POPULAR_TRACKS: 'Most popular tracks this month',
  TRACKS_PLAYED_LONG_TIME_AGO: 'Tracks not played long time ago',
  VICTORIES_BY_LEVEL: 'victories by level',
  DETAILED: 'detailed',
  NAME: 'name',
  AMPASS: 'ampass',
  SCORES_count: 'scores',
  PLAYCOUNT: 'plays',
  PROFILE_NOT_FOUND: 'Profile not found',

  EXP_FAQ_TITLE: 'Experience FAQ',
  EXP_FAQ: (
    <>
      Player's <strong>experience</strong> is based on the number of played charts.
      <br />
      Higher levels and better scores give more exp.
      <br />
      More attempts on the same chart do not grant extra exp. To level up, play new and harder
      charts.
    </>
  ),
  EXP_TITLES_LIST_HEADER: <>Possible ranks and experience needed to acquire them:</>,

  // score date tooltip
  EXACT_DATE_UNKNOWN: 'exact date unknown',
  SCORE_WAS_TAKEN: 'score was taken',
  DATE_RECORDED: 'date recorded',
  FROM: 'from',
  OR: 'or',
  SCORE_ADDED_MANUALLY: 'score was added manually',

  // achievements
  /* russian:
    COMBO_500: '500 комбо',
    COMBO_1000: '1000 комбо',
    COMBO_2000: '2000 комбо',
    FINGERING: 'Мастер фингеринга',
    FINGERING_DESC: 'Сыграть Monkey Fingers, Kimchi Fingers, Monkey Fingers 2, Money Fingers',
    SIGHTREADER: 'Сайтридер',
    SIGHTREADER_DESC: 'Получить идеальный скор с первой попытки',
    EIGHT_BIT: '8-бит',
    EIGHT_BIT_DESC: 'Сыграть Seize My Day, Tales of Pumpnia и Pumptris (8bit ver.)',
    LOVE_IS: 'Love is...',
    LOVE_IS_DESC: 'Сыграть все треки Love is a Danger Zone',
    SNAIL: 'Улитка',
    SNAIL_DESC:
      'Мастер замедлений: сыграть старшие чарты Twist of Fate, Karyawisata, Awakening и Moonlight',
    BROWN_S: 'Коричневая S',
    BROWN_S_DESC: 'Получить 0 миссов, но 5+ бэдов',
    LIFE_BAR: 'Мы выживали как могли',
    LIFE_BAR_DESC: 'Получить меньше 800.000 скора, но удержать лайфбар',
    PAD_MISS: 'Падовый мисс',
    PAD_MISS_DESC:
      'Когда от идеального скора тебя удерживают только миссы из-за плохого моддинга падов',
  */
  COMBO_500: '500 combo',
  COMBO_1000: '1000 combo',
  COMBO_2000: '2000 combo',
  FINGERING: 'Fingering master',
  FINGERING_DESC: 'Play Monkey Fingers, Kimchi Fingers, Monkey Fingers 2, Money Fingers',
  SIGHTREADER: 'Sightreader',
  SIGHTREADER_DESC: 'Get perfect score on the first try',
  EIGHT_BIT: '8-bit',
  EIGHT_BIT_DESC: 'Play Seize My Day, Tales of Pumpnia and Pumptris (8bit ver.)',
  LOVE_IS: 'Love is...',
  LOVE_IS_DESC: 'Play all Love is a Danger Zone tracks',
  SNAIL: 'Snail',
  SNAIL_DESC:
    'Master of slowdowns: play high level charts for Twist of Fate, Karyawisata, Awakening and Moonlight',
  BROWN_S: 'Brown S',
  BROWN_S_DESC: 'Get 0 misses, but 5+ bads',
  LIFE_BAR: 'Survival instincts',
  LIFE_BAR_DESC: "Get less than 800.000 score, but don't drop the life bar",
  PAD_MISS: 'Pad miss',
  PAD_MISS_DESC: 'When you are held back from a perfect score only by misses due to bad pads',
  WEEK_LONG_TRAINING: 'Dedication',
  WEEK_LONG_TRAINING_DESC: 'Play at least one chart every day for a week',
  // Using "any" is totally okay in "satisfies" assertions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} satisfies Record<string, React.ReactNode | ((...args: any[]) => React.ReactNode)>;

export type BaseTranslation = typeof en;
