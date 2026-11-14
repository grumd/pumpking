import { agents } from './agents';
import { players } from './players';
import { purgatory } from './purgatory';
import { results } from './results';
import { tracks } from './tracks';
import { router } from 'trpc/trpc';

export const admin = router({
  purgatory,
  results,
  players,
  tracks,
  agents,
});
