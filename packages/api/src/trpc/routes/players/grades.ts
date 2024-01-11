import { getPlayerGradeStats } from 'services/players/playerGrades';
import { publicProcedure } from 'trpc/trpc';
import { z } from 'zod';

export const grades = publicProcedure.input(z.number().optional()).query(async ({ input }) => {
  if (!input) {
    throw new Error('No player ID provided');
  }
  return getPlayerGradeStats(input);
});
