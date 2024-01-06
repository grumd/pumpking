import css from './exp-rank-img.module.scss';

import { ranks } from './expRanks';

interface ExpRankImgProps {
  exp: number | null;
}

export const ExpRankImg = ({ exp }: ExpRankImgProps) => {
  const rankIndex = exp ? ranks.findLastIndex((rank) => rank.threshold <= exp) : 0;
  const rank = ranks[rankIndex];
  if (!rank) return null;

  const title = exp
    ? `${Math.floor(exp)}` +
      (rankIndex < ranks.length - 1
        ? ` (${ranks[rankIndex + 1].threshold - Math.floor(exp)} to next rank)`
        : '')
    : 'N/A';

  return (
    <img
      className={`${rank.color} ${css.expRank}`}
      src={`/ranks/${rank.iconName}`}
      title={title}
      alt={`Exp: ${rank.threshold}`}
    />
  );
};
