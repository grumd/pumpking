import { getPlayers } from 'services/players/players';
import { publicProcedure } from 'trpc/trpc';

export const list = publicProcedure.query(() => getPlayers());
