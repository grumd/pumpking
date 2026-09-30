import {
  COUNTED_CHARTS,
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

export interface PlayerChartBests {
  playerId: number;
  nickname: string;
  bests: { sharedChartId: number; score: number }[];
}

export interface LeaderboardEntry {
  playerId: number;
  nickname: string;
  rank: number;
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
      nickname: player.nickname,
      total: counted.reduce((sum, chart) => sum + chart.score, 0),
      bestSingle: sorted[0]?.score ?? 0,
      charts: sorted.map((chart) => ({ ...chart, counted: counted.includes(chart) })),
    };
  });

  scored.sort(
    (a, b) => b.total - a.total || b.bestSingle - a.bestSingle || a.playerId - b.playerId
  );

  return scored.map(({ bestSingle, ...entry }) => ({
    ...entry,
    rank: 1 + scored.filter((other) => other.total > entry.total).length,
  }));
};
