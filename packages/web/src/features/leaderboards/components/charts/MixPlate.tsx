import { Badge } from '@mantine/core';
import { mixColor } from 'theme/tokens';

import { isMixNumber } from 'utils/scoring/grades';

import { useFilter } from '../../hooks/useFilter';

interface MixPlateProps {
  mix: number;
}

export const MixPlate = ({ mix }: MixPlateProps): JSX.Element | null => {
  const { mixes } = useFilter();

  const currentMix = mixes?.length ? Math.max(...mixes) : null;

  return isMixNumber(mix) && currentMix !== null && currentMix !== mix ? (
    <Badge size="xs" color={mixColor(mix)}>
      {
        {
          24: 'PR',
          25: 'PR2',
          26: 'XX',
          27: 'PH',
          28: 'PH2',
        }[mix]
      }
    </Badge>
  ) : null;
};
