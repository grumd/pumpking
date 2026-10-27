import { MIXES } from './mixes';

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

/**
 * The score the arcade shows for these stats on a mix. The arcade computes it in floating
 * point and rounds down, so when the exact score is a whole number it can show one less.
 * Phoenix and Phoenix 2 order the operations differently, so they show one less for
 * different stats. Both orders were found from real results (all Phoenix and Phoenix 2
 * results of the prod database match them). Before Phoenix there was no such score on
 * the arcade: it's the exact score, rounded down
 */
export const getPhoenixScore = (stats: PhoenixScoreStats, mixId: number): number => {
  if (mixId < MIXES.Phoenix) {
    return Math.floor(getUnroundedPhoenixScore(stats));
  }
  const { perfect, great, good, bad, miss, combo } = stats;
  const notes = perfect + great + good + bad + miss;
  const judged = perfect + 0.6 * great + 0.2 * good + 0.1 * bad;
  if (mixId === MIXES.Phoenix) {
    return Math.floor(995_000 * (judged / notes) + 5000 * (combo / notes));
  }
  return Math.floor((995_000 * judged + 5000 * combo) / notes);
};
