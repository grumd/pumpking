import { addResultMutation } from './addResult';
import { router } from 'trpc/trpc';

export const results = router({
  addResultMutation,
});
