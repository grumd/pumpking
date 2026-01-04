import { memo } from 'react';

import './flag.scss';

interface FlagProps {
  region: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const Flag = memo(function Flag({ region, className, size = 'md' }: FlagProps) {
  return (
    <img
      className={`flag flag--${size} ${className ?? ''}`}
      src={`https://osu.ppy.sh/images/flags/${region}.png`}
      alt={`${region} flag`}
    />
  );
});
