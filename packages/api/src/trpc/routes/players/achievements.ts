import { getPlayerAchievements } from 'services/players/playerAchievements';
import { publicProcedure } from 'trpc/trpc';
import { z } from 'zod';

export const achievements = publicProcedure
  .input(z.number().optional())
  .query(async ({ input }) => {
    if (!input) {
      throw new Error('No player ID provided');
    }
    return getPlayerAchievements(input);
  });
