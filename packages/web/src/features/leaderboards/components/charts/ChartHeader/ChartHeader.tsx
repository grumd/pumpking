import { Text } from '@mantine/core';
import qs from 'query-string';
import { FaYoutube } from 'react-icons/fa';
import { NavLink } from 'react-router-dom';

import css from './chart-header.module.scss';

import { routes } from 'constants/routes';

import type { ChartApiOutput } from 'features/leaderboards/hooks/useChartsQuery';

import { labelToTypeLevel } from 'legacy-code/utils/leaderboards';

import { ChartLabel } from './ChartLabel';

interface ChartHeaderProps {
  chart: ChartApiOutput;
}

export const ChartHeader = ({ chart }: ChartHeaderProps): JSX.Element => {
  const [chartType] = labelToTypeLevel(chart.label);

  return (
    <div className={css.songHeader}>
      <ChartLabel type={chartType} level={chart.level ?? '?'} />
      <div className={css.songName}>
        <NavLink to={routes.leaderboard.sharedChart.getPath({ sharedChartId: chart.id })}>
          {chart.songName}
        </NavLink>{' '}
        <Text component="span" c="dimmed">
          {chart.difficulty ? `(${chart.difficulty.toFixed(1)}) ` : ''}
        </Text>
      </div>
      <div className={css.youtubeLink}>
        <a
          href={`https://youtube.com/results?${qs.stringify({
            search_query: `${chart.songName} ${chart.label}`.replace(/( -)|(- )/g, ' '),
          })}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FaYoutube />
        </a>
      </div>
    </div>
  );
};
