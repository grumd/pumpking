import { router } from 'trpc/trpc';

import { search } from './search';

export const charts = router({
  search,
});
