import { grades } from './grades';
import { list } from './list';
import { pp } from './pp';
import { stats } from './stats';
import { router } from 'trpc/trpc';

export const players = router({
  list,
  stats,
  grades,
  pp,
});
