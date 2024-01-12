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

import { usePlayerPpHistory } from '../hooks/usePlayerPpHistory';

export const PpHistoryGraph = () => {
  const params = useParams();
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
    <ResponsiveContainer aspect={1.6}>
      <LineChart data={graphData} margin={{ top: 5, bottom: 5, right: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(value) => new Date(value).toLocaleDateString()}
        />
        <YAxis
          allowDecimals={false}
          domain={([dataMin, dataMax]) => [Math.max(0, dataMin - 100), dataMax + 100]}
          tickFormatter={(x) => `${Math.round(x)}`}
          width={40}
        />
        <RechartsTooltip
          isAnimationActive={false}
          content={({ payload }) => {
            if (!payload || !payload[0]) {
              return null;
            }
            return (
              <div className="history-tooltip">
                <div>{new Date(payload[0].payload.date).toLocaleDateString()}</div>
                {payload && payload[0] && <div>PP: {payload[0].value}</div>}
              </div>
            );
          }}
        />
        <Line
          type="monotone"
          isAnimationActive={false}
          dataKey="pp"
          stroke="#88d3ff"
          strokeWidth={3}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
