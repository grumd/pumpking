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

import css from './grades-graph.module.scss';

import { useGradesGraphData } from '../hooks/usePlayerGrades';

const GradesGraph = () => {
  const params = useParams();
  const graphData = useGradesGraphData({
    playerId: params.id ? Number(params.id) : undefined,
  });

  if (!graphData) {
    return null;
  }

  type Root = (typeof graphData)[number];

  const getGradeKey = (grade: string) => {
    return (x: Root) => (100 * (x.byGrade[grade] ?? 0)) / x.totalPlayedCharts;
  };

  return (
    <ResponsiveContainer aspect={1.6}>
      <BarChart data={graphData} margin={{ top: 5, bottom: 5, right: 5, left: 0 }}>
        <RechartsTooltip<number, string>
          isAnimationActive={false}
          content={({ payload }) => {
            if (!payload || !payload[0]) {
              return null;
            }
            return (
              <div className={css.historyTooltip}>
                <div>Level: {payload[0].payload.level}</div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, min-content)',
                    gap: '0 0.5em',
                  }}
                >
                  {payload
                    .filter((item) => item.value)
                    .map((item) => (
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
                        <span>{item.name}: </span>
                        <span>
                          {/* Recharts has wrong TS types */}
                          {(item.dataKey as unknown as ReturnType<typeof getGradeKey>)(
                            item.payload
                          ).toFixed(1)}
                          %
                        </span>
                        <span>{item.name ? item.payload.byGrade[item.name] ?? 0 : null}</span>
                      </div>
                    ))}
                </div>
              </div>
            );
          }}
        />
        <XAxis dataKey="level" />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 50, 100]}
          tickFormatter={(x) => `${Math.round(x)}%`}
          width={40}
        />
        <Legend />
        <Bar name="SSS+" dataKey={getGradeKey('SSS+')} fill="#0cd8d8" stackId="stack" />
        <Bar name="SSS" dataKey={getGradeKey('SSS')} fill="#13adad" stackId="stack" />
        <Bar name="SS+" dataKey={getGradeKey('SS+')} fill="#ffd900" stackId="stack" />
        <Bar name="SS" dataKey={getGradeKey('SS')} fill="#debc00" stackId="stack" />
        <Bar name="S+" dataKey={getGradeKey('S+')} fill="#c1a400" stackId="stack" />
        <Bar name="S" dataKey={getGradeKey('S')} fill="#a78e00" stackId="stack" />
        <Bar name="AAA+" dataKey={getGradeKey('AAA+')} fill="#c4cde0" stackId="stack" />
        <Bar name="AAA" dataKey={getGradeKey('AAA')} fill="#a2abb5" stackId="stack" />
        <Bar name="AA+" dataKey={getGradeKey('AA+')} fill="#c36134" stackId="stack" />
        <Bar name="AA" dataKey={getGradeKey('AA')} fill="#a85027" stackId="stack" />
        <Bar name="A+" dataKey={getGradeKey('A+')} fill="#7a4228" stackId="stack" />
        <Bar name="A" dataKey={getGradeKey('A')} fill="#5a3b2d" stackId="stack" />
        <Bar name="B" dataKey={getGradeKey('B')} fill="#6e5a83" stackId="stack" />
        <Bar name="C" dataKey={getGradeKey('C')} fill="#5f4f6f" stackId="stack" />
        <Bar name="D" dataKey={getGradeKey('D')} fill="#4a4155" stackId="stack" />
        <Bar name="F" dataKey={getGradeKey('F')} fill="#480404" stackId="stack" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default GradesGraph;
