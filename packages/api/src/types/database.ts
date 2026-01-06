import type { ColumnType } from 'kysely';

export type Decimal = ColumnType<string, string | number, string | number>;

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export type Json = ColumnType<JsonValue, string, string>;

export type JsonArray = JsonValue[];

export type JsonObject = {
  [K in string]?: JsonValue;
};

export type JsonPrimitive = boolean | null | number | string;

export type JsonValue = JsonArray | JsonObject | JsonPrimitive;

export interface Agents {
  id: Generated<number>;
  name: string;
  token: string;
  title: string;
}

export interface AgentSessions {
  agent_id: number;
  added_at: Date;
  last_updated_at: Date;
  client_session_mark: string;
  status: Json;
}

export interface ApschedulerJobs {
  id: string;
  next_run_time: number | null;
  job_state: Buffer;
}

export interface ArcadePlayerNames {
  mix_id: number;
  player_id: number;
  name: string;
  name_edist: Generated<number>;
}

export interface ArcadeTrackNames {
  mix_id: number;
  track_id: number;
  name: string;
  name_edist: Generated<number>;
}

export interface BestResults {
  shared_chart_id: number;
  player_id: number;
  best_score_no_rank_result_id: number | null;
  best_score_rank_result_id: number | null;
  best_grade_result_id: number | null;
}

export interface ChartInstances {
  id: Generated<number>;
  track: number;
  shared_chart: number;
  mix: number;
  label: string;
  level: number | null;
  players: number | null;
  max_total_steps: number | null;
  min_total_steps: number | null;
  max_possible_score_norank: number | null;
  max_possible_score_norank_from_result: number | null;
  interpolated_difficulty: number | null;
  type: 'D' | 'S' | null;
}

export interface DraftScores {
  id: Generated<number>;
  added: Date;
  operator_token: string;
  track_name: string;
  mix_name: string;
  chart_label: string;
  player_name: string | null;
  gained: Date | null;
  score: number | null;
  misses: number | null;
  bads: number | null;
  goods: number | null;
  greats: number | null;
  perfects: number | null;
  grade: string | null;
  max_combo: number | null;
  calories: number | null;
}

export interface EloChanges {
  id: number | null;
  player_id: number | null;
  player_result_id: number | null;
  enemy_result_id: number | null;
  elo_start: Decimal | null;
  elo_end: Decimal | null;
  elo_change_calculated: Decimal | null;
  elo_change_effective: Decimal | null;
  elo_change_total: Decimal | null;
}

export interface Mixes {
  id: Generated<number>;
  name: string;
}

export interface Operators {
  id: Generated<number>;
  token: string;
}

export interface PhoenixTrackNames {
  track: number;
  name: string;
  max_edit_distance: Generated<number>;
}

export interface PlayerPreferencesJson {
  showHiddenPlayersInRanking: boolean;
  playersHiddenStatus: Record<number, boolean>;
  hiddenRegions: Record<string, boolean>;
}

export interface Players {
  id: Generated<number>;
  nickname: string;
  arcade_xx_name: string | null;
  arcade_xx_name_edist: Generated<number | null>;
  arcade_phoenix_name: string | null;
  arcade_phoenix_name_edist: Generated<number | null>;
  email: string | null;
  region: string | null;
  hidden: Generated<number>;
  hidden_since: Date | null;
  discard_results: Generated<number | null>;
  actual_player_id: number | null;
  telegram_id: number | null;
  telegram_tag: string | null;
  telegram_bot_preferences: Json | null;
  preferences: ColumnType<PlayerPreferencesJson, string, string> | null;
  show_all_regions: Generated<number | null>;
  preferences_updated: Date | null;
  stat_top_req_counter: Generated<number>;
  stat_top_last_req_at: Date | null;
  pp: number | null;
  is_admin: Generated<number | null>;
  can_add_results_manually: Generated<number | null>;
  arcade_name: string | null;
  exp: Decimal | null;
  openai_prompt_tokens: Generated<number>;
  openai_completion_tokens: Generated<number>;
  openai_cost: Generated<Decimal>;
}

export interface PpHistory {
  date: Date;
  player_id: number;
  pp: Decimal;
}

export interface PpRankHistory {
  date: Date;
  player_id: number;
  rank: number;
}

export interface Purgatory {
  id: Generated<number>;
  screen_file: string | null;
  recognition_notes: string;
  reason: string;
  added: Date;
  agent: number;
  track_name: string;
  mix_name: string;
  chart_label: string;
  player_name: string;
  gained: Date;
  exact_gain_date: number;
  rank_mode: number | null;
  mods_list: string | null;
  score: number | null;
  score_increase: number | null;
  misses: number | null;
  bads: number | null;
  goods: number | null;
  greats: number | null;
  perfects: number | null;
  steps_sum: number | null;
  grade: string | null;
  is_pass: number | null;
  plate: string | null;
  max_combo: number | null;
  calories: number | null;
}

export interface Results {
  id: Generated<number>;
  token: string;
  screen_file: string | null;
  recognition_notes: string;
  added: Date;
  agent: number;
  track_name: string;
  mix_name: string;
  mix: number;
  chart_label: string;
  shared_chart: number;
  chart_instance: number;
  player_name: string;
  player_id: number | null;
  recognized_player_id: number;
  actual_player_id: number | null;
  gained: Date;
  exact_gain_date: number;
  rank_mode: number | null;
  mods_list: string | null;
  score: number | null;
  score_xx: number | null;
  score_phoenix: number | null;
  score_increase: number | null;
  misses: number | null;
  bads: number | null;
  goods: number | null;
  greats: number | null;
  perfects: number | null;
  grade: string | null;
  is_pass: number | null;
  plate: string | null;
  max_combo: number | null;
  calories: number | null;
  is_new_best_score: number | null;
  is_hidden: Generated<number>;
  notes: string | null;
  pp: number | null;
  is_manual_input: Generated<number | null>;
  exp: Decimal | null;
}

export interface ResultsBestGrade {
  player_id: number;
  shared_chart_id: number;
  result_id: number;
}

export interface Sessions {
  id: string;
  player: number;
  established: Date;
  valid_until: Date;
}

export interface SharedCharts {
  id: Generated<number>;
  track: number;
  index_in_track: number;
  pumpout_id: number | null;
  last_updated_at: Date | null;
  top_results_added_at: Date | null;
  max_pp: number | null;
}

export interface TournamentBrackets {
  id: Generated<number>;
  tournament_id: number | null;
  name: string | null;
  min_level: number | null;
  max_level: number | null;
  min_player_level: number | null;
  max_player_level: number | null;
  singles_count: number | null;
  doubles_count: number | null;
  mix: number | null;
}

export interface TournamentCharts {
  id: Generated<number>;
  tournament_id: number | null;
  tournament_bracket_id: number | null;
  chart_instance_id: number | null;
}

export interface Tournaments {
  id: Generated<number>;
  start_date: Date | null;
  end_date: Date | null;
  voting_end_date: Date | null;
  created_on: Date | null;
  state: string | null;
}

export interface Tracks {
  id: Generated<number>;
  external_id: string;
  full_name: string;
  short_name: string | null;
  duration: 'Full' | 'Remix' | 'Short' | 'Standard' | null;
  pumpout_id: number | null;
}

export interface XxTrackNames {
  track: number;
  name: string;
  max_edit_distance: Generated<number>;
}

export interface DB {
  agent_sessions: AgentSessions;
  agents: Agents;
  apscheduler_jobs: ApschedulerJobs;
  arcade_player_names: ArcadePlayerNames;
  arcade_track_names: ArcadeTrackNames;
  best_results: BestResults;
  chart_instances: ChartInstances;
  draft_scores: DraftScores;
  elo_changes: EloChanges;
  mixes: Mixes;
  operators: Operators;
  phoenix_track_names: PhoenixTrackNames;
  players: Players;
  pp_history: PpHistory;
  pp_rank_history: PpRankHistory;
  purgatory: Purgatory;
  results: Results;
  results_best_grade: ResultsBestGrade;
  sessions: Sessions;
  shared_charts: SharedCharts;
  tournament_brackets: TournamentBrackets;
  tournament_charts: TournamentCharts;
  tournaments: Tournaments;
  tracks: Tracks;
  xx_track_names: XxTrackNames;
}
