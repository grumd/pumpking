import _ from 'lodash/fp';

import {
  GiLoveSong,
  GiLifeBar,
  GiSmokingFinger,
  GiSnail,
  GiRetroController,
  GiRank1,
  GiRank2,
  GiRank3,
  GiWoodenPegleg,
  GiPodiumSecond,
} from 'react-icons/gi';

export const achievements = {
  '500 комбо': {
    icon: GiRank1,
    description: 'Заработать 500+ комбо на любом чарте',
    resultFunction: (result, chart, state) => {
      return {
        progress: state.progress === 100 ? 100 : result.combo >= 500 ? 100 : 0,
      };
    },
  },
  '1000 комбо': {
    icon: GiRank2,
    description: 'Заработать 1000+ комбо на любом чарте',
    resultFunction: (result, chart, state) => {
      return {
        progress: state.progress === 100 ? 100 : result.combo >= 1000 ? 100 : 0,
      };
    },
  },
  '2000 комбо': {
    icon: GiRank3,
    description: 'Заработать 2000+ комбо на любом чарте',
    resultFunction: (result, chart, state) => {
      return {
        progress: state.progress === 100 ? 100 : result.combo >= 2000 ? 100 : 0,
      };
    },
  },
  'Мастер фингеринга': {
    icon: GiSmokingFinger,
    description: 'Сыграть все Fingers треки',
    initialState: {
      progress: 0,
      playedSongs: [],
      songsToPlay: ['Monkey Fingers', 'Kimchi Fingers', 'Monkey Fingers 2', 'Money Fingers'],
    },
    resultFunction: (result, chart, state) => {
      const playedSongs = state.songsToPlay.includes(chart.song)
        ? _.uniq([...state.playedSongs, chart.song])
        : state.playedSongs;
      return {
        playedSongs,
        songsToPlay: state.songsToPlay,
        progress: (100 * playedSongs.length) / state.songsToPlay.length,
      };
    },
  },
  '8-bit': {
    icon: GiRetroController,
    description: 'Сыграть Seize My Day, Tales of Pumpnia и Pumptris (8bit ver.)',
    initialState: {
      progress: 0,
      playedSongs: [],
      songsToPlay: ['Seize My Day', 'Tales of Pumpnia', 'Pumptris (8bit ver.)'],
    },
    resultFunction: (result, chart, state) => {
      const playedSongs = state.songsToPlay.includes(chart.song)
        ? _.uniq([...state.playedSongs, chart.song])
        : state.playedSongs;
      return {
        playedSongs,
        songsToPlay: state.songsToPlay,
        progress: (100 * playedSongs.length) / state.songsToPlay.length,
      };
    },
  },
  'Love is...': {
    icon: GiLoveSong,
    description: 'Сыграть все Love is a Danger Zone треки',
    initialState: {
      progress: 0,
      playedSongs: [],
      songsToPlay: [
        'Love is a Danger Zone',
        'Love is a Danger Zone [SHORT]',
        'Love is a Danger Zone (Cranky Mix)',
        'Love is a Danger Zone 2',
        'Love is a Danger Zone 2 [SHORT]',
        'Love is a Danger Zone 2 [FULL]',
        'Love is a Danger Zone 2 (D&G Ver.)',
        'Love is a Danger Zone (try to B.P.M.)',
      ],
    },
    resultFunction: (result, chart, state) => {
      const playedSongs = state.songsToPlay.includes(chart.song)
        ? _.uniq([...state.playedSongs, chart.song])
        : state.playedSongs;
      return {
        playedSongs,
        songsToPlay: state.songsToPlay,
        progress: (100 * playedSongs.length) / state.songsToPlay.length,
      };
    },
  },
  Улитка: {
    icon: GiSnail,
    description:
      'Мастер замедлений: сыграть старшие чарты Twist of Fate, Karyawisata, Awakening и Moonlight',
    initialState: {
      progress: 0,
      playedSongs: [],
      songsToPlay: [
        { song: 'Twist of Fate (feat. Ruriling)', charts: ['D20', 'S19'] },
        { song: 'Karyawisata', charts: ['S20', 'D16'] },
        { song: 'Awakening', charts: ['S19', 'D20'] },
        { song: 'Moonlight', charts: ['S19', 'D21'] },
      ],
    },
    resultFunction: (result, chart, state) => {
      const playedSongs = state.songsToPlay.some(
        songToPlay => chart.song === songToPlay.song && songToPlay.charts.includes(chart.chartLabel)
      )
        ? _.uniq([...state.playedSongs, chart.song])
        : state.playedSongs;
      return {
        playedSongs,
        songsToPlay: state.songsToPlay,
        progress: (100 * playedSongs.length) / state.songsToPlay.length,
      };
    },
  },
  'Коричневая S': {
    icon: GiPodiumSecond,
    description: 'Получить S, но 5+ бэдов',
    resultFunction: (result, chart, state) => {
      return {
        progress: state.progress === 100 ? 100 : result.miss === 0 && result.bad >= 5 ? 100 : 0,
      };
    },
  },
  'Мы выживали как могли': {
    icon: GiLifeBar,
    description: 'Получить B или ниже, но удержать лайфбар',
    resultFunction: (result, chart, state) => {
      return {
        progress:
          state.progress === 100 ? 100 : ['B+', 'C+', 'D+'].includes(result.grade) ? 100 : 0,
      };
    },
  },
  'Падовый мисс': {
    icon: GiWoodenPegleg,
    description: 'Когда от SSS тебя удерживают только миссы из-за плохого моддинга падов',
    resultFunction: (result, chart, state) => {
      return {
        progress:
          state.progress === 100
            ? 100
            : result.miss > 0 && result.bad === 0 && result.good === 0 && result.great === 0
            ? 100
            : 0,
      };
    },
  },
};

export const initialAchievementState = {
  progress: 0,
};
