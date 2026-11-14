export const pageOptions = {
  getNextPageParam: (lastPage: { nextCursor: number | null }) => lastPage.nextCursor,
  initialCursor: 0,
};

export const latestResultsInput = (playerId: number | undefined) => ({ playerId, pageSize: 20 });

export const bestScoresInput = (playerId: number | undefined) => ({ playerId, pageSize: 20 });

export const ppBreakdownInput = (playerId: number | undefined) => ({ playerId, pageSize: 20 });

export const mostPlayedInput = (playerId: number | undefined) => ({ playerId, pageSize: 10 });
