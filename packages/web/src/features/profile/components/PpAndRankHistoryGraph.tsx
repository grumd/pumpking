import { useParams } from 'react-router';

import { EmptyState } from 'components/EmptyState/EmptyState';

import { useLanguage } from 'utils/context/translation';

import { usePpHistorySeries } from '../hooks/usePpHistorySeries';
import { TimeSeriesGraph } from './TimeSeriesGraph';

// pp (left axis) and the ranking place (right axis) on one graph with one brush
export const PpAndRankHistoryGraph = () => {
  const params = useParams();
  const lang = useLanguage();
  const playerId = params.id ? Number(params.id) : undefined;
  const series = usePpHistorySeries({ playerId, rankColor: 'var(--pk-graph-second)' });

  if (!series) {
    return null;
  }
  const { pp, rank } = series;
  if (!pp.data.length && !rank.data.length) {
    return <EmptyState>{lang.NOTHING_FOUND}</EmptyState>;
  }

  return (
    <TimeSeriesGraph
      key={playerId}
      // Taller than one line's graph: two lines, and as tall as the grades next to it
      aspect={0.9}
      series={pp.data.length && rank.data.length ? [pp, rank] : [pp.data.length ? pp : rank]}
    />
  );
};
