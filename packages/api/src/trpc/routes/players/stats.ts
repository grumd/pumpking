import { getPlayersStats } from 'services/players/players';
import { publicProcedure } from 'trpc/trpc';

export const stats = publicProcedure.query(async ({ ctx }) => {
  return getPlayersStats();
});
