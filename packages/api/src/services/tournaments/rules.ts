import {
  COUNTED_CHARTS,
  RANKED_MIN_CHARTS,
  SKILL_CHARTS_REQUIRED,
  TOURNAMENT_BRACKETS,
  type BracketCode,
} from 'constants/tournaments';

// The highest level L with SKILL_CHARTS_REQUIRED qualifying charts at L or harder.
export const skillLevel = (qualifyingLevels: number[]): number | null => {
  const sorted = [...qualifyingLevels].sort((a, b) => b - a);
  return sorted[SKILL_CHARTS_REQUIRED - 1] ?? null;
};

export const bracketForSkill = (skill: number | null): BracketCode => {
  if (skill === null) {
    return 'Easy';
  }
  const bracket =
    TOURNAMENT_BRACKETS.find((b) => skill < b.maxSkill) ?? TOURNAMENT_BRACKETS.at(-1)!;
  return bracket.code;
};

export type Medal = 'gold' | 'silver' | 'bronze';

export const medalForRank = (rank: number | null): Medal | null =>
  rank === null ? null : (['gold', 'silver', 'bronze'] as const)[rank - 1] ?? null;

export interface PlayerChartBests {
  playerId: number;
  bests: { sharedChartId: number; score: number }[];
}

export interface LeaderboardEntry {
  playerId: number;
  // null: fewer than RANKED_MIN_CHARTS charts played, listed by total without a place
  rank: number | null;
  total: number;
  charts: { sharedChartId: number; score: number; counted: boolean }[];
}

export const rankLeaderboard = (players: PlayerChartBests[]): LeaderboardEntry[] => {
  const scored = players.map((player) => {
    const sorted = [...player.bests].sort(
      (a, b) => b.score - a.score || a.sharedChartId - b.sharedChartId
    );
    const counted = sorted.slice(0, COUNTED_CHARTS);
    return {
      playerId: player.playerId,
      total: counted.reduce((sum, chart) => sum + chart.score, 0),
      bestSingle: sorted[0]?.score ?? 0,
      charts: sorted.map((chart) => ({ ...chart, counted: counted.includes(chart) })),
    };
  });

  scored.sort(
    (a, b) => b.total - a.total || b.bestSingle - a.bestSingle || a.playerId - b.playerId
  );

  const ranked = scored.filter((player) => player.charts.length >= RANKED_MIN_CHARTS);

  return scored.map(({ bestSingle, ...entry }) => ({
    ...entry,
    rank: ranked.some((player) => player.playerId === entry.playerId)
      ? 1 + ranked.filter((other) => other.total > entry.total).length
      : null,
  }));
};
