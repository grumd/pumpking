/**
 * The two ways ingestion turns a result down (the legacy `result_validation_stats.py`).
 * The messages are shown to admins and sent back to piu-spy.
 */

// The result couldn't be matched to a player / track / chart, or its stats don't add up.
// Screen results go to purgatory, where an admin can fix and recheck them; manual ones
// are rejected
export class UnrecognizedResult extends Error {}

// A result that isn't wanted at all, e.g. an empty score or a UCS chart: dropped
export class DiscardedResult extends Error {}
