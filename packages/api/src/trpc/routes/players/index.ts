import { achievements } from './achievements';
import { grades } from './grades';
import { list } from './list';
import { mostPlayed } from './mostPlayedCharts';
import { pp } from './pp';
import { stats } from './stats';
import { router } from 'trpc/trpc';

export const players = router({
  list,
  stats,
  grades,
  pp,
  achievements,
  mostPlayed,
});
