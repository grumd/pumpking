export const routes = {
  leaderboard: {
    path: `/leaderboard`,
    sharedChart: {
      path: `/leaderboard/chart/:sharedChartId`,
      getPath: (params: { sharedChartId: number | string }) =>
        `/leaderboard/chart/${params.sharedChartId}`,
      addResult: {
        path: `/leaderboard/chart/:sharedChartId/add-result`,
        getPath: (params: { sharedChartId: number | string }) =>
          `/leaderboard/chart/${params.sharedChartId}/add-result`,
      },
    },
  },
  leaderboardOld: {
    path: `/leaderboard-old`,
  },
  songs: {
    path: `/songs`,
  },
  ranking: {
    path: `/ranking`,
    faq: {
      path: '/ranking/faq',
    },
  },
  tournaments: {
    path: `/tournaments`,
  },
  profile: {
    path: `/profiles/:id`,
    getPath: (params: { id: number | string }) => `/profiles/${params.id}`,
    resultsByLevel: {
      path: `/profiles/:id/levels`,
      getPath: (params: { id: number | string }) => `/profiles/${params.id}/levels`,
      level: {
        path: `/profiles/:id/levels/:level`,
        getPath: (params: { id: number | string; level: number | string }) =>
          `/profiles/${params.id}/levels/${params.level}`,
      },
    },
    compare: {
      path: `/profiles/:id/vs/:compareToId`,
      getPath: (params: { id: number | string; compareToId: number | string }) =>
        `/profiles/${params.id}/vs/${params.compareToId}`,
    },
  },
} as const;
