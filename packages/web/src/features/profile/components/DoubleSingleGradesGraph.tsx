import { Box, Paper, Stack, Text } from '@mantine/core';
import { useMemo } from 'react';
import { useParams } from 'react-router';
import {
  Bar,
  BarChart,
  Label,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import type { ContentType } from 'recharts/types/component/Tooltip';
import { gradeColorVar } from 'theme/tokens';

import { KeyValueList } from 'components/KeyValueList/KeyValueList';

import { useGradesGraphData } from '../hooks/usePlayerGrades';
import { SeriesLabel } from './SeriesLabel';
import { axisProps } from './graphAxis';

const gradeKeys = [
  ['S', 'SSS+'],
  ['S', 'SSS'],
  ['S', 'SS+'],
  ['S', 'SS'],
  ['S', 'S+'],
  ['S', 'S'],
  ['S', 'AAA+'],
  ['S', 'AAA'],
  ['S', 'AA+'],
  ['S', 'AA'],
  ['S', 'A+'],
  ['S', 'A'],
  ['S', 'B'],
  ['S', 'C'],
  ['S', 'D'],
  ['S', 'F'],
  ['D', 'SSS+'],
  ['D', 'SSS'],
  ['D', 'SS+'],
  ['D', 'SS'],
  ['D', 'S+'],
  ['D', 'S'],
  ['D', 'AAA+'],
  ['D', 'AAA'],
  ['D', 'AA+'],
  ['D', 'AA'],
  ['D', 'A+'],
  ['D', 'A'],
  ['D', 'B'],
  ['D', 'C'],
  ['D', 'D'],
  ['D', 'F'],
] as const;

const TooltipContent: ContentType<number, string> = ({ payload }) => {
  if (!payload || !payload[0]) {
    return null;
  }
  const root = payload[0].payload as NonNullable<ReturnType<typeof useGradesGraphData>>[number];

  const gradeItems = (type: 'S' | 'D') =>
    gradeKeys
      .filter(([itemType, grade]) => itemType === type && root.byTypeGrade[`${type}-${grade}`])
      .map(([, grade]) => {
        const count = root.byTypeGrade[`${type}-${grade}`] ?? 0;
        const percent = (100 * count) / root.totalChartsByType[type];
        return {
          label: <SeriesLabel color={gradeColorVar(grade)}>{grade}</SeriesLabel>,
          value: `${percent.toFixed(1)}% (${count})`,
        };
      });
  const singleItems = gradeItems('S');
  const doubleItems = gradeItems('D');

  return (
    <Paper p="xs" withBorder>
      <Stack gap="xxs">
        <KeyValueList items={[{ label: 'Level', value: root.level }]} />
        {!!singleItems.length && (
          <>
            <Text size="sm">Singles: (total {root.totalChartsByType.S})</Text>
            <KeyValueList items={singleItems} />
          </>
        )}
        {!!doubleItems.length && (
          <>
            <Text size="sm">Doubles: (total {root.totalChartsByType.D})</Text>
            <KeyValueList items={doubleItems} />
          </>
        )}
      </Stack>
    </Paper>
  );
};

const yAxisFormatter = (x: number) => `${Math.round(Math.abs(x))}%`;
const yAxisDomain = ([dataMin, dataMax]: [number, number]): [number, number] => [
  Math.min(dataMin, -10),
  Math.max(10, dataMax),
];

const GradesGraph = () => {
  const params = useParams();
  const graphData = useGradesGraphData({
    playerId: params.id ? Number(params.id) : undefined,
  });

  const graphDataMapped = useMemo(() => {
    return graphData?.map((x) => {
      return {
        ...x,
        ...gradeKeys.reduce((acc: Record<string, number>, [type, grade]) => {
          const key = `${type}-${grade}`;
          return {
            ...acc,
            [key]:
              ((type === 'D' ? -100 : 100) * (x.byTypeGrade[key] ?? 0)) / x.totalChartsByType[type],
          };
        }, {}),
      };
    });
  }, [graphData]);

  if (!graphDataMapped) {
    return null;
  }

  return (
    // Axis ticks and the legend in the caption size
    <Box fz="xs">
      <ResponsiveContainer aspect={0.74}>
        <BarChart
          data={graphDataMapped}
          margin={{ top: 5, bottom: 5, right: 5, left: 0 }}
          stackOffset="sign"
        >
          <RechartsTooltip<number, string>
            isAnimationActive={false}
            wrapperStyle={{ zIndex: 'var(--mantine-z-index-popover)' }}
            content={TooltipContent}
          />
          <XAxis dataKey="level" {...axisProps} />
          <YAxis tickFormatter={yAxisFormatter} width={48} domain={yAxisDomain} {...axisProps} />
          {gradeKeys.map(([type, grade]) => (
            <Bar
              key={`${type}-${grade}`}
              name={`${type}-${grade}`}
              dataKey={`${type}-${grade}`}
              fill={gradeColorVar(grade)}
              stackId="stack"
            />
          ))}
          <Label value="Double" offset={0} position="insideBottomLeft" />
          <Label value="Single" offset={0} position="insideTopLeft" />
          <ReferenceLine y={0} stroke="var(--pk-graph-reference)" />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default GradesGraph;
