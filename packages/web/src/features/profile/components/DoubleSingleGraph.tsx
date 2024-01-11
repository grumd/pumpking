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

import css from './grades-graph.module.scss';

import { useGradesGraphData } from '../hooks/usePlayerGrades';

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
    <ResponsiveContainer aspect={1.6}>
      <BarChart
        data={graphData}
        stackOffset="sign"
        margin={{ top: 5, bottom: 5, right: 5, left: 0 }}
      >
        <RechartsTooltip<number, string>
          isAnimationActive={false}
          content={({ payload }) => {
            if (!payload || !payload[0]) {
              return null;
            }
            const root = payload[0].payload as Root;
            const totalD = root.totalChartsByType.D ?? 0;
            const totalS = root.totalChartsByType.S ?? 0;
            return (
              <div className={css.historyTooltip}>
                <div>Level: {root.level}</div>
                {totalS > 0 && payload[1].value != null && (
                  <div style={{ fontWeight: 'bold', color: payload[1].color }}>
                    Single: {Math.abs(payload[1].value).toFixed(1)}% (
                    {Math.round((payload[1].value * totalS) / 100)}/{totalS})
                  </div>
                )}
                {totalD > 0 && payload[0].value != null && (
                  <div style={{ fontWeight: 'bold', color: payload[0].color }}>
                    Double: {Math.abs(payload[0].value).toFixed(1)}% (
                    {Math.round((Math.abs(payload[0].value) * totalD) / 100)}/{totalD})
                  </div>
                )}
              </div>
            );
          }}
        />
        <XAxis dataKey="level" />
        <YAxis
          tickFormatter={(x) => Math.round(Math.abs(x)) + '%'}
          width={40}
          domain={([dataMin, dataMax]) => [Math.min(dataMin, -10), Math.max(10, dataMax)]}
        />
        <RechartsTooltip />
        <ReferenceLine y={0} stroke="#555" />
        <Legend />
        <Bar
          name="D"
          dataKey={(x) => (-100 * (x.byType.D ?? 0)) / (x.totalChartsByType.D ?? 1)}
          fill="var(--double_chart_color)"
          stackId="stack"
        />
        <Bar
          name="S"
          dataKey={(x) => (100 * (x.byType.S ?? 0)) / (x.totalChartsByType.S ?? 1)}
          fill="var(--single_chart_color)"
          stackId="stack"
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default DoubleSingleGraph;
