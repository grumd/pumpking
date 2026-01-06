import { addResultMutation } from './addResult';
import { recognizeScoreMutation } from './recognizeScore';
import { router } from 'trpc/trpc';

export const results = router({
  addResultMutation,
  recognizeScoreMutation,
});
