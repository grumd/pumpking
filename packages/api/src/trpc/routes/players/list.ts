import { publicProcedure } from 'trpc/trpc';

import { getPlayers } from 'services/players/players';

export const list = publicProcedure.query(() => getPlayers());
