import { MIXES } from './mixes';

export interface PhoenixScoreStats {
  perfect: number;
  great: number;
  good: number;
  bad: number;
  miss: number;
  combo: number;
}

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
