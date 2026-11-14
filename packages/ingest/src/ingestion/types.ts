import type { ChartInstance } from '@pumpking/database/tracks';

export type { ChartInstance };

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

export interface ResultRow extends ResultData {
  score: number;
  recognized_player_id: number;
  mix: number;
  chart_instance: number;
  shared_chart: number;
  score_phoenix: number | null;
}

export interface ValidResult {
  row: ResultRow;
  chart: ChartInstance;
  steps: number;
}

export type CheckedResult =
  | ({ outcome: 'valid' } & ValidResult)
  | { outcome: 'unrecognized'; reason: string }
  | { outcome: 'discarded'; reason: string };

export interface CheckOptions {
  skipScoreCheck?: boolean;
}
