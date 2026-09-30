export const routes = {
  register: {
    path: '/register',
  },
  discordCallback: {
    path: '/discord-callback/code/:code/redirect/:redirectTo',
    getPath: (params: { code?: string; redirectTo?: 'register' | 'login' }) =>
      `/discord-callback/code/${params.code}/redirect/${params.redirectTo}`,
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
  admin: {
    path: `/admin`,
    purgatory: {
      path: `/admin/purgatory`,
      getPath: (params: { id: number }) => `/admin/purgatory/${params.id}`,
    },
    results: {
      path: `/admin/results`,
      getPath: (params: { id: number }) => `/admin/results/${params.id}`,
    },
    players: {
      path: `/admin/players`,
      getPath: (params: { id: number | 'new' }) => `/admin/players/${params.id}`,
    },
    tracks: {
      path: `/admin/tracks`,
      getPath: (params: { id: number; chartInstanceId?: number }) =>
        `/admin/tracks/${params.id}` +
        (params.chartInstanceId ? `?chart=${params.chartInstanceId}` : ''),
    },
    agents: {
      path: `/admin/agents`,
    },
  },
} as const;
