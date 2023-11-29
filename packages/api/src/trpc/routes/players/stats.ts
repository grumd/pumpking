import { publicProcedure } from 'trpc/trpc';

import { getPlayersStats } from 'services/players/players';

export const stats = publicProcedure.query(async ({ ctx }) => {
  return getPlayersStats();
});
