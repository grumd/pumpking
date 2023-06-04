import React from 'react';

export const gradeValue = {
  F: 0.1,
  D: 0.2,
  'D+': 0.3,
  C: 0.3,
  'C+': 0.5,
  B: 0.5,
  'B+': 0.8,
  A: 0.8,
  'A+': 1,
  S: 1.1,
  SS: 1.2,
  SSS: 1.2,
};

export const getExp = (result, chart) => {
  if (!result.isBestGradeOnChart) {
    return 0;
  }
  if (chart.chartType === 'COOP') {
    return (chart.chartLevel * 1000 * (gradeValue[result.grade] || 0.8)) / 8;
  }
  const exp = (chart.chartLevel ** 2.31 * (gradeValue[result.grade] || 0.8)) / 9;
  return exp;
};

export const getRankImg = (rank) =>
  rank && <img className={rank.color} src={`/ranks/${rank.iconName}`} alt={rank.threshold} />;

export { ranks } from './expRanks';
