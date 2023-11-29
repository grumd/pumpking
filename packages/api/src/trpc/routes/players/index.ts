import { router } from 'trpc/trpc';

import { list } from './list';
import { stats } from './stats';

export const players = router({
  list,
  stats,
});
