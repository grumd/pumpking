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

export const PpRankHistoryGraph = () => {
  const params = useParams();
  const { data } = usePlayerPpHistory({
    playerId: params.id ? Number(params.id) : undefined,
  });

  const graphData = useMemo(
    () =>
      data?.rankHistory.map((x) => ({
        date: new Date(x.date).getTime(),
        rank: x.rank,
      })),
    [data?.rankHistory]
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
          domain={([, dataMax]) => [1, dataMax < 3 ? dataMax + 2 : dataMax + 1]}
          interval={0}
          reversed
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
                {payload && payload[0] && <div>Place: #{payload[0].value}</div>}
              </div>
            );
          }}
        />
        <Line
          isAnimationActive={false}
          type="stepAfter"
          dataKey="rank"
          stroke="#88d3ff"
          strokeWidth={3}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
