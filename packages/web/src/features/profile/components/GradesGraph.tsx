import { Box } from '@mantine/core';
import { useParams } from 'react-router';
import {
  Bar,
  BarChart,
  Legend,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { gradeColorVar } from 'theme/tokens';

import { KeyValueList } from 'components/KeyValueList/KeyValueList';

import { GradePhoenix } from 'utils/scoring/grades';

import { useGradesGraphData } from '../hooks/usePlayerGrades';
import { GraphTooltip } from './GraphTooltip';
import { SeriesLabel } from './SeriesLabel';
import { axisProps, tooltipProps } from './graphAxis';

const grades = Object.values(GradePhoenix);

const GradesGraph = () => {
  const params = useParams();
  const graphData = useGradesGraphData({
    playerId: params.id ? Number(params.id) : undefined,
  });

  if (!graphData) {
    return null;
  }

  type Root = (typeof graphData)[number];

  const getGradePercent = (grade: string) => {
    return (x: Root) => (100 * (x.byGrade[grade] ?? 0)) / x.totalPlayedCharts;
  };

  return (
    // Axis ticks and the legend in the caption size
    <Box fz="xs">
      <ResponsiveContainer aspect={1.6}>
        <BarChart
          stackOffset="sign"
          data={graphData}
          margin={{ top: 5, bottom: 5, right: 5, left: 0 }}
        >
          <RechartsTooltip<number, string>
            {...tooltipProps}
            content={({ payload }) => {
              if (!payload || !payload[0]) {
                return null;
              }
              const root = payload[0].payload as Root;
              return (
                <GraphTooltip>
                  <KeyValueList
                    items={[
                      { label: 'Level', value: root.level },
                      ...grades
                        .filter((grade) => root.byGrade[grade])
                        .map((grade) => ({
                          label: <SeriesLabel color={gradeColorVar(grade)}>{grade}</SeriesLabel>,
                          value: `${getGradePercent(grade)(root).toFixed(1)}% (${
                            root.byGrade[grade]
                          })`,
                        })),
                    ]}
                  />
                </GraphTooltip>
              );
            }}
          />
          <XAxis dataKey="level" {...axisProps} />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 50, 100]}
            tickFormatter={(x) => `${Math.round(x)}%`}
            width={48}
            {...axisProps}
          />
          <Legend />
          {grades.map((grade) => (
            <Bar
              key={grade}
              name={grade}
              dataKey={getGradePercent(grade)}
              fill={gradeColorVar(grade)}
              stackId="stack"
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default GradesGraph;
