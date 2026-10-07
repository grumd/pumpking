import type { ReactNode } from 'react';

import { colorByMix } from 'constants/colors';

import { isMixNumber } from 'utils/scoring/grades';

import { useFilter } from '../../hooks/useFilter';

interface MixPlateProps {
  mix: number;
  children: ReactNode;
}

// Puts the children in a bubble of the mix's color when the result is from an earlier mix
export const MixPlate = ({ mix, children }: MixPlateProps): JSX.Element => {
  const { mixes } = useFilter();

  const currentMix = mixes?.length ? Math.max(...mixes) : null;

  return isMixNumber(mix) && currentMix !== null && currentMix !== mix ? (
    <span className="mix-plate" style={{ background: colorByMix[mix] }}>
      {children}
    </span>
  ) : (
    <>{children}</>
  );
};
