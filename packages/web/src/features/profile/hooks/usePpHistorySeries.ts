import { useMemo } from 'react';

import { useLanguage } from 'utils/context/translation';

import type { TimeSeries } from '../components/TimeSeriesGraph';
import { usePlayerPpHistory } from './usePlayerPpHistory';

// Room above and under the line: 5% of what it spans, 10pp at least
const ppDomain = (values: number[]): [number, number] => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max(10, (max - min) * 0.05);
  return [Math.max(0, min - padding), max + padding];
};

// The best place on top, a place of room around the places shown (3 places at least)
const rankDomain = (values: number[]): [number, number] => {
  const top = Math.max(1, Math.min(...values) - 1);
  return [Math.max(top + 2, Math.max(...values) + 1), top];
};

/**
 * The player's pp and ranking place over time, as graph series (null while loading).
 * `rankColor`: the place line's color, the accent unless it shares a graph with pp
 */
export const usePpHistorySeries = ({
  playerId,
  rankColor = 'var(--mantine-color-accent-filled)',
}: {
  playerId: number | undefined;
  rankColor?: string;
}) => {
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
      yTicks: (scale) => scale.ticks(4),
      formatValue: (value) => value,
    };
    const rank: TimeSeries = {
      label: lang.PLACE,
      color: rankColor,
      data: data.rankHistory.map((x) => ({ date: new Date(x.date).getTime(), value: x.rank })),
      curve: 'step',
      // Two fills on one graph would muddy each other
      area: rankColor === pp.color,
      yDomain: rankDomain,
      // Whole places only
      yTicks: (scale) => scale.ticks(4).filter((x) => Number.isInteger(x)),
      formatValue: (value) => `#${value}`,
    };
    return { pp, rank };
  }, [data, lang, rankColor]);
};
