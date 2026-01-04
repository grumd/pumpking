export const routes = {
  register: {
    path: '/register',
  },
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
  songs: {
    path: `/songs`,
  },
  ranking: {
    path: `/ranking`,
  },
  tournaments: {
    path: `/tournaments`,
  },
  profile: {
    path: `/profiles/:id`,
    getPath: (params: { id?: number | string }) => `/profiles/${params.id}`,
  },
} as const;
