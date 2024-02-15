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

import css from './grades-graph.module.scss';

import { useGradesGraphData } from '../hooks/usePlayerGrades';

const colorByGrade = {
  'SSS+': '#32f1f1',
  SSS: '#16d4d4',
  'SS+': '#ffd900',
  SS: '#debc00',
  'S+': '#c1a400',
  S: '#a78e00',
  'AAA+': '#c4cde0',
  AAA: '#a2abb5',
  'AA+': '#c36134',
  AA: '#a85027',
  'A+': '#7a4228',
  A: '#5a3b2d',
  B: '#6e5a83',
  C: '#5f4f6f',
  D: '#4a4155',
  F: '#480404',
};

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
  const singleGrades = payload.filter((x) => x.value && x.name?.startsWith('S-'));
  const doubleGrades = payload.filter((x) => x.value && x.name?.startsWith('D-'));
  return (
    <div className={css.historyTooltip}>
      <div>Level: {root.level}</div>
      {!!singleGrades.length && (
        <>
          <div>Singles: (total {root.totalChartsByType.S})</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, min-content)',
              gap: '0 0.5em',
            }}
          >
            {singleGrades.map((item) =>
              item.name ? (
                <div
                  key={item.name}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'subgrid',
                    fontWeight: 'bold',
                    color: item.color,
                    gridColumn: '1/4',
                  }}
                >
                  <span>{item.name.slice(2)}: </span>
                  <span>{item.value ? `${item.value.toFixed(1)}%` : null}</span>
                  <span>({root.byTypeGrade[item.name] ?? 0})</span>
                </div>
              ) : null
            )}
          </div>
        </>
      )}
      {!!doubleGrades.length && (
        <>
          <div>Doubles: (total {root.totalChartsByType.D})</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, min-content)',
              gap: '0 0.5em',
            }}
          >
            {doubleGrades.map((item) =>
              item.name ? (
                <div
                  key={item.name}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'subgrid',
                    fontWeight: 'bold',
                    color: item.color,
                    gridColumn: '1/4',
                  }}
                >
                  <span>{item.name.slice(2)}: </span>
                  <span>{item.value ? `${(-item.value).toFixed(1)}%` : null}</span>
                  <span>({root.byTypeGrade[item.name] ?? 0})</span>
                </div>
              ) : null
            )}
          </div>
        </>
      )}
    </div>
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
    <ResponsiveContainer aspect={0.74}>
      <BarChart
        data={graphDataMapped}
        margin={{ top: 5, bottom: 5, right: 5, left: 0 }}
        stackOffset="sign"
      >
        <RechartsTooltip<number, string> isAnimationActive={false} content={TooltipContent} />
        <XAxis dataKey="level" />
        <YAxis tickFormatter={yAxisFormatter} width={40} domain={yAxisDomain} />
        {gradeKeys.map(([type, grade]) => (
          <Bar
            key={`${type}-${grade}`}
            name={`${type}-${grade}`}
            dataKey={`${type}-${grade}`}
            fill={colorByGrade[grade]}
            stackId="stack"
          />
        ))}
        <Label value="Double" offset={0} position="insideBottomLeft" />
        <Label value="Single" offset={0} position="insideTopLeft" />
        <ReferenceLine y={0} stroke="#bbb" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default GradesGraph;
