import { Box } from '@mantine/core';

import { labelToTypeLevel } from 'utils/leaderboards';

import css from './chart-label.module.css';
import { chartLabelColor } from './chartLabelColor';

interface ChartLabelProps {
  label: string;
  // The label that tells the chart type, when `label` doesn't (older mixes' labels like NL-5)
  typeLabel?: string;
  // Muted: the same label as on the previous mix (admin track detail)
  same?: boolean;
}

export const ChartLabel = ({ label, typeLabel = label, same = false }: ChartLabelProps) => {
  const [type, level] = labelToTypeLevel(label);

  if (!type || !level) {
    return <span>{label}</span>;
  }

  return (
    <Box className={css.chartLabel} bg={chartLabelColor(typeLabel) ?? 'gray'} mod={{ same }}>
      <span>{type}</span>
      <span>{level}</span>
    </Box>
  );
};
