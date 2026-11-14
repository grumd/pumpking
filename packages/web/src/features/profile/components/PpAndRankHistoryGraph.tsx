import { useParams } from 'react-router';

import { EmptyState } from 'components/EmptyState/EmptyState';

import { useLanguage } from 'utils/context/translation';

import { usePpHistorySeries } from '../hooks/usePpHistorySeries';
import { TimeSeriesGraph } from './TimeSeriesGraph';

export const PpAndRankHistoryGraph = () => {
  const params = useParams();
  const lang = useLanguage();
  const playerId = params.id ? Number(params.id) : undefined;
  const series = usePpHistorySeries({ playerId });

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
      aspect={1.6}
      series={pp.data.length && rank.data.length ? [pp, rank] : [pp.data.length ? pp : rank]}
    />
  );
};
