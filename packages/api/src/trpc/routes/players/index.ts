import { router } from 'trpc/trpc';

import { list } from './list';

export const players = router({
  list,
});
