import css from './exp-rank-img.module.scss';

export const ranks = [
  {
    threshold: 0,
    iconName: '0.png',
    color: css.bronze,
  },
  {
    threshold: 1000,
    iconName: '1.png',
    color: css.bronze,
  },
  {
    threshold: 2000,
    iconName: '2.png',
    color: css.bronze,
  },
  {
    threshold: 3000,
    iconName: '3.png',
    color: css.bronze,
  },
  {
    threshold: 4000,
    iconName: '4.png',
    color: css.bronze,
  },
  {
    threshold: 5000,
    iconName: '5.png',
    color: css.bronze,
  },
  {
    threshold: 6250,
    iconName: '6.png',
    color: css.bronze,
  },
  {
    threshold: 7500,
    iconName: '7.png',
    color: css.bronze,
  },
  {
    threshold: 8750,
    iconName: '8.png',
    color: css.bronze,
  },
  {
    threshold: 10000,
    iconName: '9.png',
    color: css.silver,
  },
  {
    threshold: 12000,
    iconName: '10.png',
    color: css.silver,
  },
  {
    threshold: 14000,
    iconName: '11.png',
    color: css.silver,
  },
  {
    threshold: 16000,
    iconName: '12.png',
    color: css.silver,
  },
  {
    threshold: 18000,
    iconName: '13.png',
    color: css.silver,
  },
  {
    threshold: 22000,
    iconName: '14.png',
    color: css.silver,
  },
  {
    threshold: 26000,
    iconName: '15.png',
    color: css.silver,
  },
  {
    threshold: 30000,
    iconName: '16.png',
    color: css.silver,
  },
  {
    threshold: 35000,
    iconName: '17.png',
    color: css.silver,
  },
  {
    threshold: 40000,
    iconName: '18.png',
    color: css.gold,
  },
  {
    threshold: 50000,
    iconName: '19.png',
    color: css.gold,
  },
  {
    threshold: 60000,
    iconName: '20.png',
    color: css.gold,
  },
  {
    threshold: 70000,
    iconName: '21.png',
    color: css.gold,
  },
  {
    threshold: 80000,
    iconName: '22.png',
    color: css.gold,
  },
  {
    threshold: 100000,
    iconName: '23.png',
    color: css.gold,
  },
  {
    threshold: 120000,
    iconName: '24.png',
    color: css.gold,
  },
  {
    threshold: 140000,
    iconName: '25.png',
    color: css.gold,
  },
  {
    threshold: 160000,
    iconName: '26.png',
    color: css.gold,
  },
  {
    threshold: 200000,
    iconName: '27.png',
    color: css.green,
  },
  {
    threshold: 250000,
    iconName: '28.png',
    color: css.purple,
  },
  {
    threshold: 300000,
    iconName: '29.png',
    color: css.purple,
  },
];

export const getRankIndex = (exp: number): number => {
  return exp ? ranks.findLastIndex((rank) => rank.threshold <= exp) : 0;
};
