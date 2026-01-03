import fs from 'fs/promises';
import os from 'node:os';
import path from 'node:path';
import sanitize from 'sanitize-filename';
import { z } from 'zod';

export const base64 = z
  .string()
  .regex(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
  .transform(async (val) => {
    const [, mimeType, base64] = val.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)!;

    const filePath = path.join(
      os.tmpdir(),
      sanitize(`pumpking-tmp-${Date.now()}-${base64.slice(0, 6)})}`)
    );

    await fs.writeFile(filePath, new Uint8Array(Buffer.from(base64, 'base64')));

    return { mimeType, filePath, dispose: () => fs.rm(filePath) };
  });
