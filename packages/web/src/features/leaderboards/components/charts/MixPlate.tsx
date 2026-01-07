import { Badge } from '@mantine/core';

import { colorByMix } from 'constants/colors';

import { Mixes, isMixNumber } from 'utils/scoring/grades';

import { useFilter } from '../../hooks/useFilter';

const scoringToMix = {
  xx: 26,
  phoenix: 27,
};

interface MixPlateProps {
  mix: number;
}

export const MixPlate = ({ mix }: MixPlateProps): JSX.Element | null => {
  const { scoring } = useFilter();

  if (!scoring || !scoringToMix[scoring]) {
    return null;
  }

  return isMixNumber(mix) && scoringToMix[scoring] !== mix ? (
    <Badge size="xs" color={colorByMix[mix]}>
      {Mixes[mix]}
    </Badge>
  ) : null;
};
