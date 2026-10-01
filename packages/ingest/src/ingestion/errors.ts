/**
 * Thrown inside validation, and turned into a CheckedResult by `checkResult` (see
 * types.ts for what each means)
 */
export class UnrecognizedResult extends Error {}

export class DiscardedResult extends Error {}
