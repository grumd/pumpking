import { memo } from 'react';

import './flag.scss';

interface FlagProps {
  region: string;
  className?: string;
}

export const Flag = memo(function Flag({ region, className }: FlagProps) {
  return (
    <img
      className={`flag ${className ?? ''}`}
      src={`https://osu.ppy.sh/images/flags/${region}.png`}
      alt={`${region} flag`}
    />
  );
});
