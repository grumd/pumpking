import { z } from 'zod';

export const arcadeNames = (maxLength: number) =>
  z.record(
    z.coerce.number(),
    z
      .object({
        name: z.string().max(maxLength),
        edist: z.number().int().min(0).max(10),
      })
      .nullable()
  );
