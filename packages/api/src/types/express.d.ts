import type * as express from 'express';
import type * as core from 'express-serve-static-core';

import type { Player } from 'models/Player';

import type { FileField } from './fileUpload';

declare module 'express' {
  interface Request<
    P = core.ParamsDictionary,
    ResBody = any,
    ReqBody = any,
    ReqQuery = core.Query,
    Locals extends Record<string, any> = Record<string, any>
  > extends express.Request<P, ResBody, ReqBody, ReqQuery, Locals> {
    user?: null | Pick<Player, 'id' | 'nickname' | 'is_admin' | 'can_add_results_manually'>;
    files?: Record<string, FileField>;
  }
}
