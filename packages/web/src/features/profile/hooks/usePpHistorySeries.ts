import { useMemo } from 'react';

import { useLanguage } from 'utils/context/translation';

import type { TimeSeries } from '../components/TimeSeriesGraph';
import { usePlayerPpHistory } from './usePlayerPpHistory';

const ppDomain = (values: number[]): [number, number] => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max(10, (max - min) * 0.05);
  return [Math.max(0, min - padding), max + padding];
};

const rankDomain = (values: number[]): [number, number] => {
  const top = Math.max(1, Math.min(...values) - 1);
  return [Math.max(top + 2, Math.max(...values) + 1), top];
};

const wholeTicks = (scale: Parameters<TimeSeries['yTicks']>[0]) =>
  scale.ticks(4).filter((x) => Number.isInteger(x));

export const usePpHistorySeries = ({ playerId }: { playerId: number | undefined }) => {
  const lang = useLanguage();
  const { data } = usePlayerPpHistory({ playerId });

  return useMemo(() => {
    if (!data) {
      return null;
    }
    const pp: TimeSeries = {
      label: lang.PP,
      color: 'var(--mantine-color-accent-filled)',
      data: data.history.map((x) => ({ date: new Date(x.date).getTime(), value: x.pp })),
      curve: 'smooth',
      area: true,
      yDomain: ppDomain,
      yTicks: wholeTicks,
      formatValue: (value) => value,
    };
    const rank: TimeSeries = {
      label: lang.PLACE,
      color: 'var(--pk-graph-second)',
      data: data.rankHistory.map((x) => ({ date: new Date(x.date).getTime(), value: x.rank })),
      curve: 'step',
      area: false,
      yDomain: rankDomain,
      yTicks: wholeTicks,
      formatValue: (value) => `#${value}`,
    };
    return { pp, rank };
  }, [data, lang]);
};
