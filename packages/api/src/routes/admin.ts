import { adminFileController } from 'controllers/admin/files';
import { Router } from 'express';
import { adminAuth } from 'middlewares/auth/auth';
import { validate } from 'utils';

const router = Router();

/**
 * GET /admin/files/{source}/{id}/{kind}
 * @summary Send the screen file (screenshot or video) or the scan JSON of a result or purgatory row. Admins only. A REST route rather than tRPC because it sends binary files
 * @tags admin
 * @param {string} source.path.required - results or purgatory
 * @param {string} id.path.required - Id of the result or purgatory row
 * @param {string} kind.path.required - screen or scan
 * @return {string} 200 - the file, as an attachment
 */
router.get(
  '/files/:source/:id/:kind',
  adminAuth,
  validate({
    params: {
      source: 'required|in:results,purgatory',
      id: 'required|integer',
      kind: 'required|in:screen,scan',
    },
  }),
  adminFileController
);

export default router;
