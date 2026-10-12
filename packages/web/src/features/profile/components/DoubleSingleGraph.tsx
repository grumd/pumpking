import { Box } from '@mantine/core';
import { useParams } from 'react-router';
import {
  Bar,
  BarChart,
  Legend,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

import { KeyValueList } from 'components/KeyValueList/KeyValueList';

import { useGradesGraphData } from '../hooks/usePlayerGrades';
import { GraphTooltip } from './GraphTooltip';
import { SeriesLabel } from './SeriesLabel';
import { axisProps, tooltipProps } from './graphAxis';

const DoubleSingleGraph = () => {
  const params = useParams();
  const graphData = useGradesGraphData({
    playerId: params.id ? Number(params.id) : undefined,
  });

  if (!graphData) {
    return null;
  }

  type Root = (typeof graphData)[number];

  return (
    // Axis ticks and the legend in the caption size
    <Box fz="xs">
      <ResponsiveContainer aspect={1.6}>
        <BarChart
          data={graphData}
          stackOffset="sign"
          margin={{ top: 5, bottom: 5, right: 5, left: 0 }}
        >
          <RechartsTooltip<number, string>
            {...tooltipProps}
            content={({ payload }) => {
              if (!payload || !payload[0]) {
                return null;
              }
              const root = payload[0].payload as Root;
              const totalD = root.totalChartsByType.D ?? 0;
              const totalS = root.totalChartsByType.S ?? 0;
              const singlePercent = payload[1]?.value;
              const doublePercent = payload[0].value;
              return (
                <GraphTooltip>
                  <KeyValueList
                    items={[
                      { label: 'Level', value: root.level },
                      totalS > 0 &&
                        singlePercent != null && {
                          label: (
                            <SeriesLabel color="var(--mantine-color-single-filled)">
                              Single
                            </SeriesLabel>
                          ),
                          value: `${Math.abs(singlePercent).toFixed(1)}% (${Math.round(
                            (singlePercent * totalS) / 100
                          )}/${totalS})`,
                        },
                      totalD > 0 &&
                        doublePercent != null && {
                          label: (
                            <SeriesLabel color="var(--mantine-color-double-filled)">
                              Double
                            </SeriesLabel>
                          ),
                          value: `${Math.abs(doublePercent).toFixed(1)}% (${Math.round(
                            (Math.abs(doublePercent) * totalD) / 100
                          )}/${totalD})`,
                        },
                    ]}
                  />
                </GraphTooltip>
              );
            }}
          />
          <XAxis dataKey="level" {...axisProps} />
          <YAxis
            tickFormatter={(x) => Math.round(Math.abs(x)) + '%'}
            width={48}
            {...axisProps}
            domain={([dataMin, dataMax]) => [Math.min(dataMin, -10), Math.max(10, dataMax)]}
          />
          <ReferenceLine y={0} stroke="var(--pk-graph-reference)" />
          <Legend />
          <Bar
            name="D"
            dataKey={(x) => (-100 * (x.byType.D ?? 0)) / (x.totalChartsByType.D ?? 1)}
            fill="var(--mantine-color-double-filled)"
            stackId="stack"
          />
          <Bar
            name="S"
            dataKey={(x) => (100 * (x.byType.S ?? 0)) / (x.totalChartsByType.S ?? 1)}
            fill="var(--mantine-color-single-filled)"
            stackId="stack"
          />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default DoubleSingleGraph;
