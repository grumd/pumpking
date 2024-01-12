import { getPlayerPpHistory } from 'services/players/playersPp';
import { publicProcedure } from 'trpc/trpc';
import { z } from 'zod';

export const pp = publicProcedure.input(z.number().optional()).query(async ({ input }) => {
  if (!input) {
    throw new Error('No player ID provided');
  }
  return getPlayerPpHistory(input);
});
