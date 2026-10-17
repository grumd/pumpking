import { addResultMutation } from './addResult';
import { checkPhotoHashes, photoCharts, recognizePhotoMutation } from './photos';
import { router } from 'trpc/trpc';

export const results = router({
  addResultMutation,
  checkPhotoHashes,
  recognizePhotoMutation,
  photoCharts,
});
