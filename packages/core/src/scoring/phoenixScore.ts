export const getPhoenixScore = ({
  perfect,
  great,
  good,
  bad,
  miss,
  combo,
}: {
  perfect: number;
  great: number;
  good: number;
  bad: number;
  miss: number;
  combo: number;
}): number => {
  return Math.floor(
    (1000000 * (0.995 * (perfect + 0.6 * great + 0.2 * good + 0.1 * bad) + 0.005 * combo)) /
      (perfect + great + good + bad + miss)
  );
};
