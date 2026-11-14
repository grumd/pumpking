import { Box } from '@mantine/core';

import { labelToTypeLevel } from 'utils/leaderboards';

import css from './chart-label.module.css';
import { chartLabelColor } from './chartLabelColor';

interface ChartLabelProps {
  label: string;
  typeLabel?: string;
  same?: boolean;
}

export const ChartLabel = ({ label, typeLabel = label, same = false }: ChartLabelProps) => {
  const [type, level] = labelToTypeLevel(label);

  if (!type || !level) {
    return <span>{label}</span>;
  }

  const isTypeLevel = `${type}${level}` === label;

  return (
    <Box className={css.chartLabel} bg={chartLabelColor(typeLabel) ?? 'gray'} mod={{ same }}>
      {isTypeLevel ? (
        <>
          <span>{type}</span>
          <span>{level}</span>
        </>
      ) : (
        <span>{label}</span>
      )}
    </Box>
  );
};
