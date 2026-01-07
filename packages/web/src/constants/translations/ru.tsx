import type { BaseTranslation } from './en';

export const ru = {
  // generic
  NOTHING_FOUND: 'Ничего не найдено',
  ERROR: 'Ошибка',
  SOMETHING_WENT_WRONG: 'Что-то пошло не так',
  // Main top menu
  LEADERBOARDS: 'лидерборды',
  RANKING: 'ранкинг',
  TOURNAMENTS: 'турниры',
  SONGS: 'треки',
  LOGOUT: 'выйти',

  // Rankings
  ACCURACY: 'точность',
  UPDATE: 'обновить',

  // Leaderboards buttons
  FILTERS: 'фильтры',
  SORTING: 'сортировка',
  PRESETS: 'пресеты',
  PRESETS_PLACEHOLDER: 'пресеты...',
  RESET_FILTERS: 'сбросить фильтры',
  REFRESH: 'обновить',
  SEARCH: 'поиск',
  FILTER_CHARTS: 'фильтр чартов',
  CHARTS: 'чарты',
  MIXES_LABEL: 'миксы',
  SONG_NAME_LABEL: 'название',
  SCORING_LABEL: 'скоринг',
  SONG_NAME_PLACEHOLDER: 'название песни...',
  PLAYERS_PLACEHOLDER: 'игроки...',
  ADD_RESULT: 'добавить результат',
  // Sorting
  BY_DATE_DESC: 'по дате (от новых к старым)',
  BY_DATE_ASC: 'по дате (от старых к новым)',
  BY_DIFFICULTY_ASC: 'по сложности (от легких к сложным)',
  BY_DIFFICULTY_DESC: 'по сложности (от сложных к легким)',
  BY_PP_DESC: 'от лучших результатов (pp)',
  BY_PP_ASC: 'от худших результатов (pp)',
  // Presets overlay
  OPEN: 'открыть',
  OVERWRITE: 'перезаписать',
  DELETE: 'удалить',
  ADD: 'добавить',
  SAVE: 'сохранить',
  CANCEL: 'Отмена',
  EMPTY: 'пусто',
  SHOW_PRESETS_TABS: 'показывать табы с пресетами',
  PRESET_NAME_PLACEHOLDER: 'имя пресета...',
  // Leaderboards Filters
  SHOW_CHARTS_PLAYED_BY: 'показывать чарты, которые сыграл:',
  EACH_OF_THESE: 'каждый из этих',
  AND_ANY_OF_THESE: 'и хоть один из этих',
  AND_NONE_OF_THESE: 'и никто из этих',
  SHOW_RANK: 'показывать ранк:',
  RANK_FILTER_SHOW_ALL: 'показывать все скоры',
  RANK_FILTER_SHOW_BEST: 'один лучший скор каждого игрока (ранк или нет)',
  RANK_FILTER_SHOW_RANK: 'только на ранке',
  RANK_FILTER_SHOW_NORANK: 'только без ранка',
  SHOW_HIDDEN_PLAYERS: 'показывать скрытых игроков',
  // Leaderboards Sorting
  SORTING_LABEL: 'сортировка:',
  SORTING_PLACEHOLDER: 'выберите сортировку',
  PLAYER_LABEL: 'игрок:',
  EXCLUDE_FROM_COMPARISON: 'не учитывать в сравнении:',
  // Sorting options
  NEW_TO_OLD_SCORES: 'от новых скоров',
  NEW_TO_OLD_SCORES_OF_A_PLAYER: 'от новых скоров конкретного игрока',
  SCORE_DIFFERENCE: 'отставанию от остальных',
  WORST_TO_BEST_BY_ELO: 'от худших результатов (эло)',
  BEST_TO_WORST_BY_ELO: 'от лучших результатов (эло)',
  WORST_TO_BEST_BY_PP: 'от худших результатов (pp)',
  BEST_TO_WORST_BY_PP: 'от лучших результатов (pp)',
  EASY_TO_HARD_CHARTS: 'от лёгких чартов',
  HARD_TO_EASY_CHARTS: 'от сложных чартов',
  // Rank options
  SHOW_ALL_SCORES: 'показывать все скоры',
  BEST_SCORE: 'один лучший скор каждого игрока (ранк или нет)',
  RANK_ONLY: 'только на ранке',
  ONLY_NO_RANK: 'только без ранка',
  // Results
  SHOW_MORE_RESULTS: (count: number) => `(показать еще ${count})`,
  // Score details overlay
  PLAYER: 'игрок',
  EXP: 'опыт',
  ELO: 'эло',
  PP: 'pp',
  MODS: 'моды',
  COMBO: 'комбо',
  CCAL: 'ккал',
  SCORE_INCREASE: 'прирост',
  ORIGINAL_MIX: 'было сыграно на',
  ORIGINAL_CHART: 'оригинальный чарт:',
  ORIGINAL_SCORE: 'оригинальный скор:',
  SIGHTREAD: '* сайтрид',
  MY_BEST_SCORE_WARNING: 'рекорд взят с my best. часть данных недоступна',
  // Other
  BACK_TO_ALL_CHARTS: 'ко всем чартам',
  NO_RESULTS: 'ничего не найдено',
  SHOW_MORE: 'показать больше',
  HIDDEN: 'скрыто',
  // Profile Results by level
  ALL: 'все',
  DOUBLES: 'даблы',
  SINGLES: 'синглы',
  UNPLAYED: 'не сыграно',
  BACK_BUTTON: 'назад',
  LEVEL_PLACEHOLDER: 'уровень...',
  // TODO: WIP, not finished

  // played time ago
  TODAY: 'сегодня',
  YESTERDAY: 'вчера',
  YESTERDAY_NIGHT: 'вчера ночью',
  TIME_AGO: 'назад',
  DAYS_SHORT: 'дн',
  WEEKS_SHORT: 'нед',
  MONTHS_SHORT: 'мес',
  NEVER: 'никогда',

  // Tournaments
  START_DATE: 'Начало:',
  END_DATE: 'Окончание:',
  BRACKETS: 'Группы чартов:',

  HIDE_UNSELECTED: 'скрыть невыбранных',
  SHOW_ALL: 'показать всех',
  HIDE_COUNTRIES: 'скрыть страны',
  RANK: 'ранк',
  LAST_TIME_PLAYED: 'последняя игра',
  COMPARE_WITH: 'сравнить с',
  GRADES: 'оценки',
  LEVELS: 'уровни',
  MORE_DETAILS: 'подробнее',
  ACCURACY_BY_LEVEL: 'точность по уровням',
  LEVEL_ACHIEVEMENTS: 'достижения по уровням',
  LEVEL_ACHIEVEMENTS_HINT:
    '* для получения ачивки нужно сыграть около 10% всех чартов данного левела на нужный грейд',
  ACHIEVEMENTS: 'достижения',
  MOST_PLAYED_CHARTS: 'часто играемые чарты',
  BEST_SCORES: 'лучшие результаты',
  PLACE_IN_TOP: 'место в топе',
  TOTAL: 'всего',
  UNITE_GRAPHS: 'объединить графики',
  RESULTS: 'Резалты:',
  TOP_POPULAR_TRACKS: 'Топ популярных треков',
  MONTHLY_TOP_POPULAR_TRACKS: 'Топ популярных треков за месяц',
  TRACKS_PLAYED_LONG_TIME_AGO: 'Треки, которые долго не играли',
  LEAST_PLAYED_TRACKS: 'Наименее популярные треки',
  VICTORIES_BY_LEVEL: 'победы по уровням',
  DETAILED: 'подробно',
  NAME: 'имя',
  AMPASS: 'ampass',
  SCORES_count: 'рекордов',
  PLAYCOUNT: 'плеев',
  PROFILE_NOT_FOUND: 'Профиль не найден',

  EXP_FAQ_TITLE: 'Опыт',
  EXP_FAQ: (
    <>
      <strong>Опыт</strong> игрока основывается на количестве сыгранных чартов.
      <br />
      Чем выше уровень чарта и чем лучше оценка на нём, тем больше опыта он даёт.
      <br />
      Повторные попытки на тех же чартах не дают больше опыта. Чтобы поднимать свой уровень, играй
      новые треки и чарты.
    </>
  ),

  EXP_TITLES_LIST_HEADER: <>Список уровней и необходимый опыт для их получения:</>,

  // score date tooltip
  EXACT_DATE_UNKNOWN: 'точная дата неизвестна',
  SCORE_WAS_TAKEN: 'скор был взят',
  DATE_RECORDED: 'дата записи',
  FROM: 'с',
  OR: 'или',
  SCORE_ADDED_MANUALLY: 'скор добавлен вручную',

  // achievements
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
  LOVE_IS_DESC: 'Сыграть все Love is a Danger Zone треки',
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
  WEEK_LONG_TRAINING: 'Усердие',
  WEEK_LONG_TRAINING_DESC: 'Сыграть хотя бы один чарт 7 дней подряд',

  // Add Result / OCR
  SUBMIT_RESULT: 'Добавить результат',
  CHART: 'Чарт',
  SCREENSHOT: 'Скриншот',
  SELECT_SCREENSHOT: 'Выберите скриншот',
  HEIC_NOT_SUPPORTED:
    'Файлы HEIC не поддерживаются. Пожалуйста, конвертируйте скриншот в JPG или PNG.',
  GRADE: 'Оценка',
  SELECT_GRADE: 'Выберите оценку',
  MIX: 'Микс',
  JUDGE_RANK: 'Ранк/джадж',
  SUBMIT: 'Отправить',
  NO_ACCESS_TO_PAGE: 'У вас нет доступа к этой странице',
  NONE_NORMAL_MODE: 'Нет (обычный режим)',
  FALSE_RESULTS_WARNING:
    'Отправка ложных результатов может привести к БАНУ. Убедитесь, что ваш скриншот читаем, а выбранные числа верны.',
  SCREENSHOT_REQUIRED: 'Скриншот обязателен',
  GRADE_REQUIRED: 'Оценка обязательна',
  PERFECT_REQUIRED: 'Perfect обязателен',
  GREAT_REQUIRED: 'Great обязателен',
  GOOD_REQUIRED: 'Good обязателен',
  BAD_REQUIRED: 'Bad обязателен',
  MISS_REQUIRED: 'Miss обязателен',
  COMBO_REQUIRED: 'Combo обязателен',
  SCORE_REQUIRED_MIN_DIGITS: 'Score обязателен (мин. 4 цифры)',
  DATE_TAKEN: 'Дата съемки',
  UNKNOWN: 'Неизвестно',
  OCR_DRAW_RECTANGLE_HINT: 'Выделите область с числами для распознавания',
  OCR_AREA_SELECTED_HINT: 'Область выделена. Нажмите "Распознать скор" для извлечения чисел.',
  RECOGNIZE_SCORE: 'Распознать скор',
  RECOGNIZED_NUMBERS: 'Распознанные числа',
  FILL_FORM: 'Вставить числа',

  // Admin
  ADMIN_PANEL: 'Админ панель',
  DELETE_RESULT: 'Удалить результат',
  DELETE_RESULT_CONFIRM:
    'Вы уверены, что хотите удалить этот результат? Это действие нельзя отменить.',
  CAN_ADD_RESULTS_MANUALLY: 'Может добавлять результаты вручную',
  ENABLED: 'Включено',
  DISABLED: 'Выключено',
  REGION: 'Регион',
  TELEGRAM_TAG: 'Телеграм тег',
  TELEGRAM_ID: 'Телеграм ID',
  HIDDEN_PLAYER: 'Скрытый игрок',
} satisfies BaseTranslation;
