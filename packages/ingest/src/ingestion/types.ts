/**
 * A result as piu-spy recognized it: the `results` / `purgatory` columns it fills. A
 * missing (undefined) field wasn't sent and isn't written; null is written as NULL.
 * Datetimes are naive 'YYYY-MM-DD HH:MM:SS' strings, like the arcade shows them (`gained`)
 * and like `added` is stored (UTC), so they are never shifted by a time zone.
 */
export interface ResultData {
  screen_file: string | null;
  recognition_notes: string;
  added: string;
  agent: number;
  track_name: string;
  mix_name: string;
  chart_label: string;
  player_name: string;
  gained: string;
  exact_gain_date: number;
  rank_mode: number | null;
  mods_list?: string | null;
  score: number | null;
  score_increase?: number | null;
  misses?: number | null;
  bads?: number | null;
  goods?: number | null;
  greats?: number | null;
  perfects?: number | null;
  max_combo?: number | null;
  calories?: number | null;
  grade: string | null;
  is_pass?: number | null;
  plate?: string | null;
}

// A chart instance that a result was matched to
export interface ChartInstance {
  id: number;
  shared_chart: number;
  mix: number;
  label: string;
  level: number | null;
  min_total_steps: number | null;
  max_total_steps: number | null;
  // tracks.duration
  duration: string | null;
}

/** A result's `results` row: what was recognized, and what validation found */
export interface ResultRow extends ResultData {
  score: number;
  recognized_player_id: number;
  mix: number;
  chart_instance: number;
  shared_chart: number;
  // Every result gets one, so results of all mixes can be compared
  score_phoenix: number | null;
}

/** A result that passed validation, ready to store */
export interface ValidResult {
  row: ResultRow;
  chart: ChartInstance;
}

/**
 * What validation decided about a result. An unrecognized result couldn't be matched to
 * a player / track / chart, or its stats don't add up: screen results go to purgatory,
 * where an admin can fix and recheck them, manual ones are rejected. A discarded result
 * isn't wanted at all, e.g. an empty score or a UCS chart. The reasons are shown to
 * admins and sent back to piu-spy
 */
export type CheckedResult =
  | ({ outcome: 'valid' } & ValidResult)
  | { outcome: 'unrecognized'; reason: string }
  | { outcome: 'discarded'; reason: string };
