import { Badge, type DefaultMantineColor } from '@mantine/core';

import { type MixNumbers, Mixes, isMixNumber } from 'utils/scoring/grades';

import { useFilter } from '../../hooks/useFilter';

const scoringToMix = {
  xx: 26,
  phoenix: 27,
};

const colorByMix: Record<MixNumbers, DefaultMantineColor> = {
  24: '#48283a99',
  25: '#432a4e99',
  26: '#2d2a4e99',
  27: '#2a434e99',
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
    <Badge color={colorByMix[mix]}>{Mixes[mix]}</Badge>
  ) : null;
};
