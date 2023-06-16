import type * as express from 'express';
import type * as core from 'express-serve-static-core';

import type { FileField } from './fileUpload';

declare module 'express' {
  interface Request<
    P = core.ParamsDictionary,
    ResBody = any,
    ReqBody = any,
    ReqQuery = core.Query,
    Locals extends Record<string, any> = Record<string, any>
  > extends express.Request<P, ResBody, ReqBody, ReqQuery, Locals> {
    user?: null | {
      id: number;
      nickname: string;
      is_admin: boolean;
      can_add_results_manually: boolean;
    };
    files?: Record<string, FileField>;
  }
}
