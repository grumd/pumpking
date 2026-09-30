import { agents } from './agents';
import { players } from './players';
import { purgatory } from './purgatory';
import { results } from './results';
import { tracks } from './tracks';
import { router } from 'trpc/trpc';

// The admin section of the web (#/admin). Every procedure requires players.is_admin
export const admin = router({
  purgatory,
  results,
  players,
  tracks,
  agents,
});
