import { Box, Paper, Text } from '@mantine/core';
import { useMemo } from 'react';
import { useParams } from 'react-router';
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

import { KeyValueList } from 'components/KeyValueList/KeyValueList';

import { useLanguage } from 'utils/context/translation';

import { usePlayerPpHistory } from '../hooks/usePlayerPpHistory';
import { axisProps } from './graphAxis';

export const PpHistoryGraph = () => {
  const params = useParams();
  const lang = useLanguage();
  const { data } = usePlayerPpHistory({
    playerId: params.id ? Number(params.id) : undefined,
  });

  const graphData = useMemo(
    () =>
      data?.history.map((x) => ({
        date: new Date(x.date).getTime(),
        pp: parseFloat(x.pp),
      })),
    [data?.history]
  );

  if (!graphData) {
    return null;
  }

  return (
    // Axis ticks and the legend in the caption size
    <Box fz="xs">
      <ResponsiveContainer aspect={1.6}>
        <LineChart data={graphData} margin={{ top: 5, bottom: 5, right: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--pk-graph-grid)" />
          <XAxis
            dataKey="date"
            {...axisProps}
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(value) => new Date(value).toLocaleDateString()}
          />
          <YAxis
            allowDecimals={false}
            domain={([dataMin, dataMax]) => [Math.max(0, dataMin - 100), dataMax + 100]}
            tickFormatter={(x) => `${Math.round(x)}`}
            width={48}
            {...axisProps}
          />
          <RechartsTooltip
            isAnimationActive={false}
            wrapperStyle={{ zIndex: 'var(--mantine-z-index-popover)' }}
            content={({ payload }) => {
              if (!payload || !payload[0]) {
                return null;
              }
              return (
                <Paper p="xs" withBorder>
                  <Text size="sm" c="dimmed">
                    {new Date(payload[0].payload.date).toLocaleDateString()}
                  </Text>
                  <KeyValueList items={[{ label: lang.PP, value: payload[0].value }]} />
                </Paper>
              );
            }}
          />
          <Line
            type="monotone"
            isAnimationActive={false}
            dataKey="pp"
            stroke="var(--mantine-color-accent-filled)"
            strokeWidth={3}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};
