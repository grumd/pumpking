import { Badge } from '@mantine/core';

import { colorByMix } from 'constants/colors';
import { mixShortNames } from 'constants/mixShortNames';

import { isMixNumber } from 'utils/scoring/grades';

import { useFilter } from '../../hooks/useFilter';

interface MixPlateProps {
  mix: number;
}

export const MixPlate = ({ mix }: MixPlateProps): JSX.Element | null => {
  const { mixes } = useFilter();

  const currentMix = mixes?.length ? Math.max(...mixes) : null;

  return isMixNumber(mix) && currentMix !== null && currentMix !== mix ? (
    <Badge size="xs" color={colorByMix[mix]}>
      {mixShortNames[mix]}
    </Badge>
  ) : null;
};
