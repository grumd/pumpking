// The inputs of the profile tab lists, shared by the lists and the background prefetch of
// the tabs that aren't open (ResultsTabs), so both use the same cache entries

export const pageOptions = {
  getNextPageParam: (lastPage: { nextCursor: number }) => lastPage.nextCursor,
  initialCursor: 0,
};

export const latestResultsInput = (playerId: number | undefined) => ({ playerId, pageSize: 20 });

export const bestScoresInput = (playerId: number | undefined) => ({ playerId, pageSize: 20 });

export const mostPlayedInput = (playerId: number | undefined) => ({ playerId, pageSize: 10 });
