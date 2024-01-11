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

  const getGradeKey = (type: 'S' | 'D', grade: string) => {
    return (x: Root) =>
      ((type === 'D' ? -100 : 100) * (x.byTypeGrade[`${type}-${grade}`] ?? 0)) /
      x.totalChartsByType[type];
  };

  return (
    <ResponsiveContainer aspect={0.74}>
      <BarChart
        data={graphData}
        margin={{ top: 5, bottom: 5, right: 5, left: 0 }}
        stackOffset="sign"
      >
        <RechartsTooltip<number, string>
          isAnimationActive={false}
          content={({ payload }) => {
            if (!payload || !payload[0]) {
              return null;
            }
            const root = payload[0].payload as Root;
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
          }}
        />
        <XAxis dataKey="level" />
        <YAxis
          tickFormatter={(x) => `${Math.round(Math.abs(x))}%`}
          width={40}
          domain={([dataMin, dataMax]) => [Math.min(dataMin, -10), Math.max(10, dataMax)]}
        />
        <Bar name="D-SSS+" dataKey={getGradeKey('D', 'SSS+')} fill="#0cd8d8" stackId="stack" />
        <Bar name="D-SSS" dataKey={getGradeKey('D', 'SSS')} fill="#13adad" stackId="stack" />
        <Bar name="D-SS+" dataKey={getGradeKey('D', 'SS+')} fill="#ffd900" stackId="stack" />
        <Bar name="D-SS" dataKey={getGradeKey('D', 'SS')} fill="#debc00" stackId="stack" />
        <Bar name="D-S+" dataKey={getGradeKey('D', 'S+')} fill="#c1a400" stackId="stack" />
        <Bar name="D-S" dataKey={getGradeKey('D', 'S')} fill="#a78e00" stackId="stack" />
        <Bar name="D-AAA+" dataKey={getGradeKey('D', 'AAA+')} fill="#c4cde0" stackId="stack" />
        <Bar name="D-AAA" dataKey={getGradeKey('D', 'AAA')} fill="#a2abb5" stackId="stack" />
        <Bar name="D-AA+" dataKey={getGradeKey('D', 'AA+')} fill="#c36134" stackId="stack" />
        <Bar name="D-AA" dataKey={getGradeKey('D', 'AA')} fill="#a85027" stackId="stack" />
        <Bar name="D-A+" dataKey={getGradeKey('D', 'A+')} fill="#7a4228" stackId="stack" />
        <Bar name="D-A" dataKey={getGradeKey('D', 'A')} fill="#5a3b2d" stackId="stack" />
        <Bar name="D-B" dataKey={getGradeKey('D', 'B')} fill="#6e5a83" stackId="stack" />
        <Bar name="D-C" dataKey={getGradeKey('D', 'C')} fill="#5f4f6f" stackId="stack" />
        <Bar name="D-D" dataKey={getGradeKey('D', 'D')} fill="#4a4155" stackId="stack" />
        <Bar name="D-F" dataKey={getGradeKey('D', 'F')} fill="#480404" stackId="stack" />
        <Bar name="S-SSS+" dataKey={getGradeKey('S', 'SSS+')} fill="#0cd8d8" stackId="stack" />
        <Bar name="S-SSS" dataKey={getGradeKey('S', 'SSS')} fill="#13adad" stackId="stack" />
        <Bar name="S-SS+" dataKey={getGradeKey('S', 'SS+')} fill="#ffd900" stackId="stack" />
        <Bar name="S-SS" dataKey={getGradeKey('S', 'SS')} fill="#debc00" stackId="stack" />
        <Bar name="S-S+" dataKey={getGradeKey('S', 'S+')} fill="#c1a400" stackId="stack" />
        <Bar name="S-S" dataKey={getGradeKey('S', 'S')} fill="#a78e00" stackId="stack" />
        <Bar name="S-AAA+" dataKey={getGradeKey('S', 'AAA+')} fill="#c4cde0" stackId="stack" />
        <Bar name="S-AAA" dataKey={getGradeKey('S', 'AAA')} fill="#a2abb5" stackId="stack" />
        <Bar name="S-AA+" dataKey={getGradeKey('S', 'AA+')} fill="#c36134" stackId="stack" />
        <Bar name="S-AA" dataKey={getGradeKey('S', 'AA')} fill="#a85027" stackId="stack" />
        <Bar name="S-A+" dataKey={getGradeKey('S', 'A+')} fill="#7a4228" stackId="stack" />
        <Bar name="S-A" dataKey={getGradeKey('S', 'A')} fill="#5a3b2d" stackId="stack" />
        <Bar name="S-B" dataKey={getGradeKey('S', 'B')} fill="#6e5a83" stackId="stack" />
        <Bar name="S-C" dataKey={getGradeKey('S', 'C')} fill="#5f4f6f" stackId="stack" />
        <Bar name="S-D" dataKey={getGradeKey('S', 'D')} fill="#4a4155" stackId="stack" />
        <Bar name="S-F" dataKey={getGradeKey('S', 'F')} fill="#480404" stackId="stack" />
        <Label value="Double" offset={0} position="insideBottomLeft" />
        <Label value="Single" offset={0} position="insideTopLeft" />
        <ReferenceLine y={0} stroke="#bbb" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default GradesGraph;
