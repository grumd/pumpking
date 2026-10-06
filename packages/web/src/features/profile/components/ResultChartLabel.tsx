import { Badge } from '@mantine/core';

import { ChartLabel } from 'components/ChartLabel/ChartLabel';

import { colorByMix } from 'constants/colors';
import { mixShortNames } from 'constants/mixShortNames';

import { isMixNumber } from 'utils/scoring/grades';

import css from './result-row.module.css';

// The chart label (from the chart's newest mix), and the result's mix when the result was
// played in another mix: on wide screens the mix column comes after the name
// (result-row.module.css), on phones the mix is under the label
export const ResultChartLabel = ({
  label,
  mix,
  labelMix,
}: {
  label: string;
  mix: number;
  labelMix: number;
}): JSX.Element => (
  <div className={css.labelCell}>
    <div className={css.label}>
      <ChartLabel label={label} />
    </div>
    {/* Always there, an empty cell keeps the columns in place */}
    <div>
      {mix !== labelMix && isMixNumber(mix) && (
        <Badge size="xs" color={colorByMix[mix]}>
          {mixShortNames[mix]}
        </Badge>
      )}
    </div>
  </div>
);
