import type { BaseTranslation } from './en';

export const pl: BaseTranslation = {
  // generic
  NOTHING_FOUND: 'Nic nie znaleziono',
  ERROR: 'Bład',
  SOMETHING_WENT_WRONG: 'Coś poszło nie tak',

  // menu
  LEADERBOARDS: 'tabele wyników',
  RANKING: 'ranking',
  TOURNAMENTS: 'turnieje',
  SONGS: 'piosenki',
  LOGOUT: 'wyloguj',

  // Rankings
  ACCURACY: 'celność',
  UPDATE: 'odśwież',

  // Leaderboards buttons
  FILTERS: 'filtry',
  SORTING: 'sortowanie',
  PRESETS: 'presety',
  PRESETS_PLACEHOLDER: 'presety...',
  RESET_FILTERS: 'resetuj filtry',
  REFRESH: 'odśwież',
  SEARCH: 'szukaj',
  FILTER_CHARTS: 'filtr czartów',
  CHARTS: 'czarty',
  MIXES_LABEL: 'miksy',
  SONG_NAME_LABEL: 'nazwa piosenki',
  SCORING_LABEL: 'punktacja',
  SONG_NAME_PLACEHOLDER: 'nazwa piosenki...',
  PLAYERS_PLACEHOLDER: 'gracze...',
  ADD_RESULT: 'dodaj wynik',
  // Sorting
  BY_DATE_DESC: 'wg daty (od nowych)',
  BY_DATE_ASC: 'wg daty (od starych)',
  BY_DIFFICULTY_ASC: 'wg trudności (od łatwych)',
  BY_DIFFICULTY_DESC: 'wg trudności (od trudnych)',
  BY_PP_DESC: 'wg pp (od dużych)',
  BY_PP_ASC: 'wg pp (od małych)',

  // Presets overlay
  OPEN: 'otwórz',
  OVERWRITE: 'nadpisz',
  DELETE: 'usuń',
  ADD: 'dodaj',
  SAVE: 'zapisz',
  CANCEL: 'Anuluj',
  EMPTY: 'pusty',
  SHOW_PRESETS_TABS: 'pokaż zakładki presetów',
  PRESET_NAME_PLACEHOLDER: 'nazwa presetu...',

  // Leaderboards Filters
  SHOW_CHARTS_PLAYED_BY: 'pokaż czarty grane przez:',
  EACH_OF_THESE: 'każdego z tych',
  AND_ANY_OF_THESE: 'i któregokolwiek z tych',
  AND_NONE_OF_THESE: 'i żadnego z tych',
  SHOW_RANK: 'pokaż rank:',
  RANK_FILTER_SHOW_ALL: 'pokaż wszystkie wyniki',
  RANK_FILTER_SHOW_BEST: 'jeden najlepszy wynik każdego gracza (rank lub nie)',
  RANK_FILTER_SHOW_RANK: 'tylko z rankiem',
  RANK_FILTER_SHOW_NORANK: 'tylko bez ranku',
  SHOW_HIDDEN_PLAYERS: 'pokaż ukrytych graczy',

  // Leaderboards Sorting
  SORTING_LABEL: 'sortowanie:',
  SORTING_PLACEHOLDER: 'wybierz sortowanie',
  PLAYER_LABEL: 'gracz:',
  EXCLUDE_FROM_COMPARISON: 'wyklucz z porównania:',

  // Sorting options
  NEW_TO_OLD_SCORES: 'od nowych do starych wyników',
  NEW_TO_OLD_SCORES_OF_A_PLAYER: 'od nowych do starych wyników gracza',
  SCORE_DIFFERENCE: 'różnica wyników',
  WORST_TO_BEST_BY_ELO: 'od najgorszych do najlepszych (elo)',
  BEST_TO_WORST_BY_ELO: 'od najlepszych do najgorszych (elo)',
  WORST_TO_BEST_BY_PP: 'od najgorszych do najlepszych (pp)',
  BEST_TO_WORST_BY_PP: 'od najlepszych do najgorszych (pp)',
  EASY_TO_HARD_CHARTS: 'od łatwych do trudnych czartów',
  HARD_TO_EASY_CHARTS: 'od trudnych do łatwych czartów',

  // Rank options
  SHOW_ALL_SCORES: 'pokaż wszystkie wyniki',
  BEST_SCORE: 'jeden najlepszy wynik każdego gracza (rank lub nie)',
  RANK_ONLY: 'tylko z rankiem',
  ONLY_NO_RANK: 'tylko bez ranku',

  // Results
  SHOW_MORE_RESULTS: (count: number) => `(pokaż jeszcze ${count})`,

  // Score details overlay
  PLAYER: 'gracz',
  EXP: 'exp',
  ELO: 'elo',
  PP: 'pp',
  MODS: 'mody',
  COMBO: 'combo',
  CCAL: 'kcal',
  SCORE_INCREASE: 'wzrost',
  ORIGINAL_MIX: 'zagrano na',
  ORIGINAL_CHART: 'oryginalny czart:',
  ORIGINAL_SCORE: 'oryginalny wynik:',
  SIGHTREAD: '* sightread',

  // Other
  MY_BEST_SCORE_WARNING: 'Dokładna data uzyskania wyniku nie jest znana',
  BACK_TO_ALL_CHARTS: 'powrót do wszystkich czartów',
  NO_RESULTS: 'nie znaleziono wyników',
  SHOW_MORE: 'pokaż więcej',
  HIDDEN: 'ukryty',

  // Profile Results by level
  ALL: 'wszystkie',
  DOUBLES: 'double',
  SINGLES: 'single',
  UNPLAYED: 'niezagrane',
  BACK_BUTTON: 'wstecz',
  LEVEL_PLACEHOLDER: 'poziom...',

  // played time ago
  TODAY: 'dzisiaj',
  YESTERDAY: 'wczoraj',
  YESTERDAY_NIGHT: 'wczoraj w nocy',
  TIME_AGO: 'temu',
  DAYS_SHORT: 'dni',
  WEEKS_SHORT: 'tyg',
  MONTHS_SHORT: 'mies',
  NEVER: 'nigdy',

  // Tournaments
  START_DATE: 'Początek:',
  END_DATE: 'Koniec:',
  BRACKETS: 'Drabinka:',

  HIDE_UNSELECTED: 'ukryj niezaznaczone',
  SHOW_ALL: 'pokaż wszystko',
  HIDE_COUNTRIES: 'ukryj kraje',
  RANK: 'rank',
  LAST_TIME_PLAYED: 'ostatnio grane',
  COMPARE_WITH: 'porównaj z',
  GRADES: 'oceny',
  LEVELS: 'poziomy',
  MORE_DETAILS: 'więcej szczegółów',
  ACCURACY_BY_LEVEL: 'celność wg poziomu',
  LEVEL_ACHIEVEMENTS: 'osiągnięcia wg poziomu',
  LEVEL_ACHIEVEMENTS_HINT:
    '* aby zdobyć osiągnięcie, musisz zagrać ~10% wszystkich czartów danego poziomu na określoną ocenę',
  ACHIEVEMENTS: 'osiągnięcia',
  MOST_PLAYED_CHARTS: 'najczęściej grane czarty',
  BEST_SCORES: 'najlepsze wyniki',
  PLACE_IN_TOP: 'miejsce w top',
  TOTAL: 'razem',
  UNITE_GRAPHS: 'połącz wykresy',
  RESULTS: 'Wyniki:',
  TOP_POPULAR_TRACKS: 'Najpopularniejsze utwory',
  MONTHLY_TOP_POPULAR_TRACKS: 'Najpopularniejsze utwory w tym miesiącu',
  TRACKS_PLAYED_LONG_TIME_AGO: 'Utwory dawno niegrane',
  LEAST_PLAYED_TRACKS: 'Najrzadziej grane utwory',
  VICTORIES_BY_LEVEL: 'zwycięstwa wg poziomu',
  DETAILED: 'szczegółowo',
  NAME: 'nazwa',
  AMPASS: 'ampass',
  SCORES_count: 'wyniki',
  PLAYCOUNT: 'rozgrywki',
  PROFILE_NOT_FOUND: 'Profil nie znaleziony',

  EXP_FAQ_TITLE: 'FAQ Doświadczenia',
  EXP_FAQ: (
    <>
      <strong>Doświadczenie</strong> gracza jest oparte na liczbie zagranych czartów.
      <br />
      Wyższe poziomy i lepsze wyniki dają więcej exp.
      <br />
      Więcej prób na tym samym czarcie nie daje dodatkowego exp. Aby awansować, graj nowe i
      trudniejsze czarty.
    </>
  ),
  EXP_TITLES_LIST_HEADER: <>Możliwe rangi i doświadczenie potrzebne do ich zdobycia:</>,

  // score date tooltip
  EXACT_DATE_UNKNOWN: 'dokładna data nieznana',
  SCORE_WAS_TAKEN: 'wynik został uzyskany',
  DATE_RECORDED: 'data zapisana',
  FROM: 'z',
  OR: 'lub',
  SCORE_ADDED_MANUALLY: 'wynik został dodany ręcznie',

  // achievements
  COMBO_500: '500 combo',
  COMBO_1000: '1000 combo',
  COMBO_2000: '2000 combo',
  FINGERING: 'Mistrz fingeringu',
  FINGERING_DESC: 'Zagraj Monkey Fingers, Kimchi Fingers, Monkey Fingers 2, Money Fingers',
  SIGHTREADER: 'Sightreader',
  SIGHTREADER_DESC: 'Uzyskaj perfekcyjny wynik za pierwszym razem',
  EIGHT_BIT: '8-bit',
  EIGHT_BIT_DESC: 'Zagraj Seize My Day, Tales of Pumpnia i Pumptris (8bit ver.)',
  LOVE_IS: 'Love is...',
  LOVE_IS_DESC: 'Zagraj wszystkie utwory Love is a Danger Zone',
  SNAIL: 'Ślimak',
  SNAIL_DESC:
    'Mistrz spowolnień: zagraj trudne czarty Twist of Fate, Karyawisata, Awakening i Moonlight',
  BROWN_S: 'Brązowe S',
  BROWN_S_DESC: 'Uzyskaj 0 missów, ale 5+ badów',
  LIFE_BAR: 'Instynkt przetrwania',
  LIFE_BAR_DESC: 'Uzyskaj mniej niż 800.000 punktów, ale nie strac paska życia',
  PAD_MISS: 'Padowy miss',
  PAD_MISS_DESC: 'Kiedy od perfekcyjnego wyniku dzielą cię tylko missy przez źle działające pady',
  WEEK_LONG_TRAINING: 'Oddanie',
  WEEK_LONG_TRAINING_DESC: 'Zagraj przynajmniej jeden czart każdego dnia przez tydzień',

  // Add Result / OCR
  SUBMIT_RESULT: 'Dodaj wynik',
  CHART: 'Czart',
  SCREENSHOT: 'Zrzut ekranu',
  SELECT_SCREENSHOT: 'Wybierz zrzut ekranu',
  HEIC_NOT_SUPPORTED:
    'Pliki HEIC nie są obsługiwane. Proszę przekonwertować zrzut ekranu na JPG lub PNG.',
  GRADE: 'Ocena',
  SELECT_GRADE: 'Wybierz ocenę',
  MIX: 'Mix',
  JUDGE_RANK: 'Rank/judge',
  SUBMIT: 'Wyślij',
  NO_ACCESS_TO_PAGE: 'Nie masz dostępu do tej strony',
  NONE_NORMAL_MODE: 'Brak (tryb normalny)',
  FALSE_RESULTS_WARNING:
    'Przesyłanie fałszywych wyników może skutkować BANEM. Upewnij się, że zrzut ekranu jest czytelny, a wybrane liczby są poprawne.',
  SCREENSHOT_REQUIRED: 'Zrzut ekranu jest wymagany',
  GRADE_REQUIRED: 'Ocena jest wymagana',
  PERFECT_REQUIRED: 'Perfect jest wymagany',
  GREAT_REQUIRED: 'Great jest wymagany',
  GOOD_REQUIRED: 'Good jest wymagany',
  BAD_REQUIRED: 'Bad jest wymagany',
  MISS_REQUIRED: 'Miss jest wymagany',
  COMBO_REQUIRED: 'Combo jest wymagane',
  SCORE_REQUIRED_MIN_DIGITS: 'Score jest wymagany (min. 4 cyfry)',
  DATE_TAKEN: 'Data wykonania',
  UNKNOWN: 'Nieznana',
  OCR_DRAW_RECTANGLE_HINT: 'Zaznacz obszar z liczbami do rozpoznania',
  OCR_AREA_SELECTED_HINT: 'Obszar zaznaczony. Kliknij "Rozpoznaj wynik" aby wyodrębnić liczby.',
  RECOGNIZE_SCORE: 'Rozpoznaj wynik',
  RECOGNIZED_NUMBERS: 'Rozpoznane liczby',
  FILL_FORM: 'Wstaw liczby',

  // Admin
  ADMIN_PANEL: 'Panel Admina',
  DELETE_RESULT: 'Usuń wynik',
  DELETE_RESULT_CONFIRM: 'Czy na pewno chcesz usunąć ten wynik? Tej akcji nie można cofnąć.',
  CAN_ADD_RESULTS_MANUALLY: 'Może dodawać wyniki ręcznie',
  ENABLED: 'Włączone',
  DISABLED: 'Wyłączone',
  REGION: 'Region',
  TELEGRAM_TAG: 'Tag Telegram',
  TELEGRAM_ID: 'ID Telegram',
  HIDDEN_PLAYER: 'Ukryty gracz',

  // Login / Registration
  SIGN_IN_WITH_DISCORD: 'Zaloguj się przez Discord',
  SIGN_UP_WITH_DISCORD: 'Zarejestruj się przez Discord',
  CREATE_NEW_ACCOUNT: 'Utwórz nowe konto',
  ALREADY_HAVE_ACCOUNT: 'Masz już konto? Zaloguj się',
  VERIFYING_DISCORD: 'Weryfikacja konta Discord...',
  SIGNING_IN_DISCORD: 'Logowanie przez Discord...',
  NO_DISCORD_CODE: 'Nie otrzymano kodu autoryzacji od Discord',
  BACK_TO_REGISTRATION: 'Powrót do rejestracji',
  BACK_TO_LOGIN: 'Powrót do logowania',
  CREATE_YOUR_ACCOUNT: 'Utwórz swoje konto',
  EMAIL_LABEL: 'Email:',
  NICKNAME: 'Tag gracza',
  NICKNAME_PLACEHOLDER: 'Twój tag gracza',
  REGION_SELECT_PLACEHOLDER: 'Wybierz kraj',
  ARCADE_NAME_LABEL: 'Nazwa AMPASS (opcjonalnie)',
  ARCADE_NAME_PLACEHOLDER: 'Twoja nazwa w AMPASS',
  REGISTER: 'Zarejestruj się',
  VALIDATION_SELECT_COUNTRY: 'Proszę wybrać kraj',
  VALIDATION_NICKNAME_REQUIRED: 'Tag gracza jest wymagany',
  VALIDATION_NICKNAME_MIN: 'Tag gracza musi mieć co najmniej 2 znaki',
  VALIDATION_NICKNAME_MAX: 'Tag gracza może mieć maksymalnie 32 znaki',
  VALIDATION_ARCADE_NAME_MAX: 'Nazwa AMPASS może mieć maksymalnie 64 znaki',
};
