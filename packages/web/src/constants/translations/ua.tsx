import type { BaseTranslation } from './en';

export const ua = {
  // generic
  NOTHING_FOUND: 'Нічого не знайдено',
  ERROR: 'Помилка',
  // Main top menu
  LEADERBOARDS: 'лідерборди',
  RANKING: 'ранкінг',
  TOURNAMENTS: 'турніри',
  SONGS: 'треки',
  LOGOUT: 'вийти',
  // Leaderboards buttons
  FILTERS: 'фільтри',
  SORTING: 'сортування',
  PRESETS: 'пресети',
  PRESETS_PLACEHOLDER: 'пресети...',
  RESET_FILTERS: 'скинути фільтри',
  REFRESH: 'оновити',
  SEARCH: 'пошук',
  FILTER_CHARTS: 'фільтр чартів',
  CHARTS: 'чарти',
  MIXES_LABEL: 'мікси',
  SONG_NAME_LABEL: 'назва треку',
  SCORING_LABEL: 'скорінг',
  SONG_NAME_PLACEHOLDER: 'назва пісні...',
  PLAYERS_PLACEHOLDER: 'гравці...',
  ADD_RESULT: 'додати результат',
  // Sorting
  BY_DATE_DESC: 'по даті (від нових до старих)',
  BY_DATE_ASC: 'по даті (від старих до нових)',
  BY_DIFFICULTY_ASC: 'по складності (від легких до складних)',
  BY_DIFFICULTY_DESC: 'по складності (від складних до легких)',
  BY_PP_DESC: 'від кращих результатів (pp)',
  BY_PP_ASC: 'від гірших результатів (pp)',
  // Presets overlay
  OPEN: 'відкрити',
  OVERWRITE: 'перезаписати',
  DELETE: 'видалити',
  ADD: 'додати',
  SAVE: 'зберегти',
  CANCEL: 'відміна',
  EMPTY: 'порожньо',
  SHOW_PRESETS_TABS: 'показувати таби із пресетами',
  PRESET_NAME_PLACEHOLDER: 'назва пресету...',
  // Leaderboards Filters
  SHOW_CHARTS_PLAYED_BY: 'показувати чарти, які зіграв:',
  EACH_OF_THESE: 'кожен із цих',
  AND_ANY_OF_THESE: 'і хоч один із цих',
  AND_NONE_OF_THESE: 'і жоден із цих',
  SHOW_RANK: 'показувати ранк:',
  RANK_FILTER_SHOW_ALL: 'показывати усі скори',
  RANK_FILTER_SHOW_BEST: 'один кращий скор кожного гравця (ранк чи ні)',
  RANK_FILTER_SHOW_RANK: 'тільки на ранку',
  RANK_FILTER_SHOW_NORANK: 'тільки без ранку',
  SHOW_HIDDEN_PLAYERS: 'показувати схованих гравців',
  // Leaderboards Sorting
  SORTING_LABEL: 'сортування:',
  SORTING_PLACEHOLDER: 'оберіть сортування',
  PLAYER_LABEL: 'гравець:',
  EXCLUDE_FROM_COMPARISON: 'не враховувати у порівнянні:',
  // Sorting options
  NEW_TO_OLD_SCORES: 'від нових скорів',
  NEW_TO_OLD_SCORES_OF_A_PLAYER: 'від нових скорів конкретного гравця',
  SCORE_DIFFERENCE: 'відставанню від інших',
  WORST_TO_BEST_BY_ELO: 'від гірших результатів (ело)',
  BEST_TO_WORST_BY_ELO: 'від кращих результатів (ело)',
  WORST_TO_BEST_BY_PP: 'від гірших результатів (pp)',
  BEST_TO_WORST_BY_PP: 'від кращих результатів (pp)',
  EASY_TO_HARD_CHARTS: 'від легких чартів',
  HARD_TO_EASY_CHARTS: 'від складних чартів',
  // Rank options
  SHOW_ALL_SCORES: 'показувати усі скори',
  BEST_SCORE: 'один кращий скор кожного гравця (ранк чи ні)',
  RANK_ONLY: 'тільки на ранку',
  ONLY_NO_RANK: 'тілько без ранку',
  // Results
  SHOW_MORE_RESULTS: (count: number) => `(показати ще ${count})`,
  // Score details overlay
  PLAYER: 'гравець',
  EXP: 'досвід',
  ELO: 'ело',
  PP: 'pp',
  MODS: 'моди',
  COMBO: 'комбо',
  CCAL: 'ккал',
  SCORE_INCREASE: 'приріст',
  ORIGINAL_MIX: 'було зіграно на',
  ORIGINAL_CHART: 'оригінальний чарт:',
  ORIGINAL_SCORE: 'оригінальний скор:',
  SIGHTREAD: '* сайтрід',
  MY_BEST_SCORE_WARNING: 'рекорд взято із my best. частина даних недоступна',
  // Other
  BACK_TO_ALL_CHARTS: 'до всіх чартів',
  NO_RESULTS: 'нічого не знайдено',
  SHOW_MORE: 'показати більше',
  HIDDEN: 'сховано',
  // Profile Results by level
  ALL: 'усі',
  DOUBLES: 'дабли',
  SINGLES: 'сінгли',
  UNPLAYED: 'не зіграно',
  BACK_BUTTON: 'назад',
  LEVEL_PLACEHOLDER: 'рівень...',
  // TODO: WIP, not finished

  // played time ago
  TODAY: 'сьогодні',
  YESTERDAY: 'вчора',
  YESTERDAY_NIGHT: 'вчора вночі',
  TIME_AGO: 'назад',
  DAYS_SHORT: 'дн',
  WEEKS_SHORT: 'тиж',
  MONTHS_SHORT: 'міс',
  NEVER: 'ніколи',

  // Tournaments
  START_DATE: 'Початок:',
  END_DATE: 'Закінчення:',
  BRACKETS: 'Групи чартів:',

  HIDE_UNSELECTED: 'сховати невибраних',
  SHOW_ALL: 'показати всіх',
  RANK: 'ранк',
  LAST_TIME_PLAYED: 'востаннє грав',
  COMPARE_WITH: 'порівняти із',
  GRADES: 'оцінки',
  LEVELS: 'рівні',
  MORE_DETAILS: 'детальніше',
  ACCURACY_BY_LEVEL: 'точність по рівнях',
  LEVEL_ACHIEVEMENTS: 'досягнення по рівнях',
  LEVEL_ACHIEVEMENTS_HINT:
    '* для отримання ачівки треба зіграти близько 10% усіх чартів даного рівня на потрібний грейд',
  ACHIEVEMENTS: 'досягнення',
  MOST_PLAYED_CHARTS: 'чарти, що часто гралися',
  BEST_SCORES: 'найкращі результати',
  PLACE_IN_TOP: 'місце у топі',
  TOTAL: 'усього',
  UNITE_GRAPHS: "об'єднати графіки",
  RESULTS: 'Резалти:',
  TOP_POPULAR_TRACKS: 'Топ популярних треків',
  MONTHLY_TOP_POPULAR_TRACKS: 'Топ популярних треків за місяць',
  TRACKS_PLAYED_LONG_TIME_AGO: 'Треки, які довго не грали',
  VICTORIES_BY_LEVEL: 'перемоги по рівнях',
  DETAILED: 'детально',
  NAME: "ім'я",
  AMPASS: 'ampass',
  SCORES_count: 'рекордів',
  PLAYCOUNT: 'плеїв',
  PROFILE_NOT_FOUND: 'Профіль не знайдено',

  EXP_FAQ_TITLE: 'Досвід',
  EXP_FAQ: (
    <>
      <strong>Досвід</strong> гравця засновується на кількості зіграних чартів.
      <br />
      Чим вище рівень чарту і краще оцінка на ньому, тем більше досвіду він дає.
      <br />
      Повторні спроби на тих же чартах не дають додатковий досвід. Щоб піднімати свій рівень, грай
      нові треки та чарти.
    </>
  ),

  EXP_TITLES_LIST_HEADER: <>Список рівнів та необхідний досвій для їх отримання:</>,

  // score date tooltip
  EXACT_DATE_UNKNOWN: 'точна дата невідома',
  SCORE_WAS_TAKEN: 'скор був взятий',
  DATE_RECORDED: 'дата запису',
  FROM: 'з',
  OR: 'або',
  SCORE_ADDED_MANUALLY: 'скор був доданий вручну',

  // achievements
  COMBO_500: '500 комбо',
  COMBO_1000: '1000 комбо',
  COMBO_2000: '2000 комбо',
  FINGERING: 'Майстер фінгерінгу',
  FINGERING_DESC: 'Зіграти Monkey Fingers, Kimchi Fingers, Monkey Fingers 2, Money Fingers',
  SIGHTREADER: 'Сайтрідер',
  SIGHTREADER_DESC: 'Отримати ідеальний скор з першої спроби',
  EIGHT_BIT: '8-біт',
  EIGHT_BIT_DESC: 'Зіграти Seize My Day, Tales of Pumpnia та Pumptris (8bit ver.)',
  LOVE_IS: 'Love is...',
  LOVE_IS_DESC: 'Зіграти всі треки Love is a Danger Zone',
  SNAIL: 'Равлик',
  SNAIL_DESC:
    'Майстер сповільнень: зіграти старші чарти Twist of Fate, Karyawisata, Awakening та Moonlight',
  BROWN_S: 'Коричнева S',
  BROWN_S_DESC: 'Отримати 0 місів, але 5+ бедів',
  LIFE_BAR: 'Ми виживали як могли',
  LIFE_BAR_DESC: 'Отримати менше 800.000 скора, але утримати лайфбар',
  PAD_MISS: 'Падовий міс',
  PAD_MISS_DESC: 'Коли від ідеального скора тебе утримують тільки міси через поганий моддинг падів',
  WEEK_LONG_TRAINING: 'Старанність',
  WEEK_LONG_TRAINING_DESC: 'Зіграти хоча б один чарт 7 днів поспіль',
} satisfies BaseTranslation;
