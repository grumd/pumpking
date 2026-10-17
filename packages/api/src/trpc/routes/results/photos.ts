import { MIXES } from '@pumpking/utils/mixes';
import fs from 'fs/promises';
import { findKnownPhotoHashes } from 'services/results/photos/duplicates';
import { PHOTO_MIXES } from 'services/results/photos/reader';
import { recognizePhoto, searchMixCharts } from 'services/results/photos/recognize';
import { addResultProcedure } from 'trpc/trpc';
import { base64 } from 'utils/zod';
import { z } from 'zod';

export const photoHash = z.string().regex(/^[0-9a-f]{64}$/);

/**
 * Of the photos' SHA-256 hashes, the ones whose result is known: added from the photo, or
 * found when the photo was read before. A mutation only so that the hashes go in the body: a
 * batch of them is too long for a URL
 */
export const checkPhotoHashes = addResultProcedure
  .input(z.object({ hashes: z.array(photoHash).min(1).max(200) }))
  .mutation(({ input }) => findKnownPhotoHashes(input.hashes));

const photoMix = z.enum(PHOTO_MIXES);

/** Charts of the mix by song name and label, for a photo whose chart wasn't found */
export const photoCharts = addResultProcedure
  .input(z.object({ mix: photoMix, search: z.string().max(100) }))
  .query(({ input }) => searchMixCharts(MIXES[input.mix], input.search));

export const recognizePhotoMutation = addResultProcedure
  .input(
    z.object({
      // 2048px JPEG for the readers, and the copy stored with the result
      image: base64,
      screenshot: base64,
      hash: photoHash,
      mix: photoMix,
      date: z.coerce.date(),
      isExactDate: z.boolean(),
      // Off for a single photo, which the user confirms
      autoSave: z.boolean(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    try {
      return await recognizePhoto({
        playerId: ctx.user.id,
        isAdmin: !!ctx.user.is_admin,
        autoSave: input.autoSave,
        mix: input.mix,
        image: { mimeType: input.image.mimeType, data: await fs.readFile(input.image.filePath) },
        screenshotPath: input.screenshot.filePath,
        hash: input.hash,
        date: input.date,
        isExactDate: input.isExactDate,
      });
    } finally {
      await Promise.all([input.image.dispose(), input.screenshot.dispose()]);
    }
  });
