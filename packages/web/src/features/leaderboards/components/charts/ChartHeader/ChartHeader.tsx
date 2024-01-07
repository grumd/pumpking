import { Badge, Group, Text } from '@mantine/core';
import qs from 'query-string';
import { FaYoutube } from 'react-icons/fa';
import { NavLink } from 'react-router-dom';

import css from './chart-header.module.scss';

import { colorByMix } from 'constants/colors';
import { routes } from 'constants/routes';

import type { ChartApiOutput } from 'features/leaderboards/hooks/useChartsQuery';

import { labelToTypeLevel } from 'legacy-code/utils/leaderboards';

import { Mixes } from 'utils/scoring/grades';

import { ChartLabel } from './ChartLabel';

interface ChartHeaderProps {
  chart: ChartApiOutput;
  children?: React.ReactNode;
}

export const ChartHeader = ({ chart, children = null }: ChartHeaderProps): JSX.Element => {
  // TODO: change to "toSorted" when more widely supported
  const instances = chart.chartInstances.slice().sort((a, b) => b.mix - a.mix);
  const [chartType] = labelToTypeLevel(instances[0].label);

  return (
    <div className={css.songHeader}>
      <ChartLabel type={chartType} level={instances[0].level ?? '?'} />
      <div className={css.songName}>
        <NavLink to={routes.leaderboard.sharedChart.getPath({ sharedChartId: chart.id })}>
          {chart.songName}
        </NavLink>{' '}
        <Text component="span" c="dimmed">
          {instances[0].difficulty ? `(${instances[0].difficulty.toFixed(1)}) ` : ''}
        </Text>
      </div>
      <div className={css.youtubeLink}>
        <a
          href={`https://youtube.com/results?${qs.stringify({
            search_query: `${chart.songName} ${instances[0].label}`.replace(/( -)|(- )/g, ' '),
          })}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FaYoutube />
        </a>
      </div>
      <Group gap="xs" ml="auto" fz="sm">
        {instances.map((instance) => {
          if (instance.level === instances[0].level) {
            return null;
          }
          return (
            <Badge key={instance.mix} color={colorByMix[instance.mix as keyof typeof colorByMix]}>
              {Mixes[instance.mix as keyof typeof Mixes]}: {instance.label}
            </Badge>
          );
        })}
        {children}
      </Group>
    </div>
  );
};
