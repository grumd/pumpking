/**
 * A result as ingestion handles it: the `results` / `purgatory` columns it writes. A
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
  // Set by validateResult
  recognized_player_id?: number;
  mix?: number;
  chart_instance?: number;
  shared_chart?: number;
  // Set when the result is stored
  score_phoenix?: number | null;
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
