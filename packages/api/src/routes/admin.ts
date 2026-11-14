import { adminFileController } from 'controllers/admin/files';
import { Router } from 'express';
import { adminAuth } from 'middlewares/auth/auth';
import { validate } from 'utils';

const router = Router();

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
