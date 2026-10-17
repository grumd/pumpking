import { useParams } from 'react-router';

import { EmptyState } from 'components/EmptyState/EmptyState';

import { useLanguage } from 'utils/context/translation';

import { usePpHistorySeries } from '../hooks/usePpHistorySeries';
import { TimeSeriesGraph } from './TimeSeriesGraph';

export const PpHistoryGraph = () => {
  const params = useParams();
  const lang = useLanguage();
  const playerId = params.id ? Number(params.id) : undefined;
  const series = usePpHistorySeries({ playerId });

  if (!series) {
    return null;
  }
  if (!series.pp.data.length) {
    return <EmptyState>{lang.NOTHING_FOUND}</EmptyState>;
  }

  return <TimeSeriesGraph key={playerId} series={[series.pp]} />;
};
