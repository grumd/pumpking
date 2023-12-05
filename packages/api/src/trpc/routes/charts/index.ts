import { chart } from './chart';
import { search } from './search';
import { router } from 'trpc/trpc';

export const charts = router({
  search,
  chart,
});
