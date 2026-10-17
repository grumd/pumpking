import { Anchor, Group, Text, Tooltip } from '@mantine/core';
import qs from 'query-string';
import { FaTrophy, FaYoutube } from 'react-icons/fa';
import { NavLink } from 'react-router-dom';

import { ChartLabel } from 'components/ChartLabel/ChartLabel';

import { routes } from 'constants/routes';

import type { ChartApiOutput } from 'features/leaderboards/hooks/useChartsQuery';

import { useLanguage } from 'utils/context/translation';

import css from './chart-header.module.css';

interface ChartHeaderProps {
  chart: ChartApiOutput;
  children?: React.ReactNode;
}

export const ChartHeader = ({ chart, children = null }: ChartHeaderProps): JSX.Element => {
  const lang = useLanguage();

  return (
    <Group pb="xs" gap="sm" align="center" wrap="wrap" className={css.header}>
      <Group gap="sm" align="center" wrap="nowrap" className={css.titleRow}>
        <ChartLabel label={chart.label} />
        <Anchor
          size="xl"
          lh="xs"
          fw="bold"
          miw={0}
          truncate
          component={NavLink}
          to={routes.leaderboard.sharedChart.getPath({ sharedChartId: chart.id })}
        >
          {chart.songName}
        </Anchor>
        <Text span c="dimmed">
          {chart.difficulty ? `(${chart.difficulty.toFixed(1)})` : ''}
        </Text>
        <Anchor
          href={`https://youtube.com/results?${qs.stringify({
            search_query: `${chart.songName} ${chart.label}`.replace(/( -)|(- )/g, ' '),
          })}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="YouTube"
          fz="xl"
          lh={0}
        >
          <FaYoutube />
        </Anchor>
      </Group>
      <Group gap="sm" align="center" wrap="wrap" ml="auto" className={css.actionsRow}>
        {chart.inTournament && (
          <Tooltip label={lang.TOURNAMENT_CHART}>
            <Anchor
              component={NavLink}
              to={routes.tournaments.path}
              aria-label={lang.TOURNAMENT_CHART}
              fz="lg"
              lh={0}
              c="gold"
            >
              <FaTrophy />
            </Anchor>
          </Tooltip>
        )}
        {children}
      </Group>
    </Group>
  );
};
