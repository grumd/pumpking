// What a purgatory reason (the legacy validation's message) is about: the fields to
// highlight, and the chart or player to link to, so the admin can fix it there

export type PurgatoryField =
  | 'player_name'
  | 'track_name'
  | 'chart_label'
  | 'mods_list'
  | 'score'
  | 'score_increase'
  | 'grade'
  | 'is_pass'
  | 'plate'
  | 'perfects'
  | 'greats'
  | 'goods'
  | 'bads'
  | 'misses'
  | 'max_combo'
  | 'calories';

const STATS: PurgatoryField[] = ['perfects', 'greats', 'goods', 'bads', 'misses'];

const RULES: [RegExp, PurgatoryField[]][] = [
  [/^Unknown player|results are discarded|actual_player_id/, ['player_name']],
  [/^Invalid track|^Invalid chart|^Ambiguous chart/, ['track_name', 'chart_label']],
  [/^Number of steps|^Result with no stats/, STATS],
  [/^Invalid score_increase|^Score increase/, ['score_increase']],
  [/^Invalid score/, ['score', ...STATS, 'max_combo']],
  [/^Invalid grade/, ['grade']],
  [/^Invalid plate|^Plate '/, ['plate']],
  [/max_combo/, ['max_combo']],
  [/^Mod |^Missing mods|rank mode|^Rank mode/, ['mods_list']],
  [/^Pass status/, ['is_pass']],
];

export const parseReason = (reason: string) => {
  const rule = RULES.find(([pattern]) => pattern.test(reason));
  const chart = reason.match(/chart #(\d+)/);
  const player = reason.match(/^Unknown player (.+?) for mix/);
  return {
    fields: rule?.[1] ?? [],
    // "Number of steps 708 is lesser than chart #20968 min 765 steps"
    chartInstanceId: chart ? Number(chart[1]) : undefined,
    // "Unknown player ANON for mix Phoenix, closest is NONO with 2 edits"
    playerName: player?.[1],
  };
};
