import cx from 'classnames';
import { memo } from 'react';

import css from './flag.module.css';

interface FlagProps {
  region: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const Flag = memo(function Flag({ region, className, size = 'md' }: FlagProps) {
  return (
    <img
      className={cx(css.flag, css[size], className)}
      src={`https://osu.ppy.sh/images/flags/${region}.png`}
      alt={`${region} flag`}
    />
  );
});
