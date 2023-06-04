export const getScoreWithoutBonus = (score, grade) => {
  if (grade === 'SSS') return score - 300000;
  if (grade === 'SS') return score - 150000;
  if (grade === 'S') return score - 100000;
  return score;
};
