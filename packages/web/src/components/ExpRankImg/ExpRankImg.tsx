import css from './exp-rank-img.module.scss';

import { getRankIndex, ranks } from './expRanks';

type ExpRankImgProps = { rankIndex: number } | { exp: number };

export const ExpRankImg = (props: ExpRankImgProps) => {
  const rankIndex = 'rankIndex' in props ? props.rankIndex : getRankIndex(props.exp);
  if (rankIndex == null) return null;

  const rank = ranks[rankIndex];

  const title =
    'exp' in props
      ? `${Math.floor(props.exp)}` +
        (rankIndex < ranks.length - 1
          ? ` (${ranks[rankIndex + 1].threshold - Math.floor(props.exp)} to next rank)`
          : '')
      : `${rank.threshold}`;

  return (
    <img
      className={`${rank.color} ${css.expRank}`}
      src={`/ranks/${rank.iconName}`}
      title={title}
      alt={`Exp: ${rank.threshold}`}
    />
  );
};
