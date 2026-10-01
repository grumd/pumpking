export interface PhoenixScoreStats {
  perfect: number;
  great: number;
  good: number;
  bad: number;
  miss: number;
  combo: number;
}

/**
 * The arcade's score formula, without its rounding down:
 * (0.995 × (Perfect + 0.6 × Great + 0.2 × Good + 0.1 × Bad) + 0.005 × Max Combo) / Total Notes × 1,000,000.
 * Written in whole numbers up to the division, so a whole score comes out exact
 */
export const getUnroundedPhoenixScore = ({
  perfect,
  great,
  good,
  bad,
  miss,
  combo,
}: PhoenixScoreStats): number =>
  (995 * (1000 * perfect + 600 * great + 200 * good + 100 * bad) + 5000 * combo) /
  (perfect + great + good + bad + miss);

/** The score the arcade shows for these stats */
export const getPhoenixScore = (stats: PhoenixScoreStats): number =>
  Math.floor(getUnroundedPhoenixScore(stats));
