import { Anchor, Badge, Group, Text, Tooltip } from '@mantine/core';
import qs from 'query-string';
import { FaTrophy, FaYoutube } from 'react-icons/fa';
import { NavLink } from 'react-router-dom';

import { ChartLabel } from 'components/ChartLabel/ChartLabel';

import { colorByMix } from 'constants/colors';
import { routes } from 'constants/routes';

import type { ChartApiOutput } from 'features/leaderboards/hooks/useChartsQuery';

import { useLanguage } from 'utils/context/translation';
import { Mixes } from 'utils/scoring/grades';

import css from './chart-header.module.css';

interface ChartHeaderProps {
  chart: ChartApiOutput;
  children?: React.ReactNode;
}

export const ChartHeader = ({ chart, children = null }: ChartHeaderProps): JSX.Element => {
  const lang = useLanguage();
  // TODO: change to "toSorted" when more widely supported
  const otherInstances = chart.otherChartInstances.slice().sort((a, b) => b.mix - a.mix);

  return (
    <Group p="xs" bdrs="xl" gap="sm" align="center" wrap="wrap" className={css.header}>
      <Group p={0} gap="sm" align="center" wrap="nowrap" className={css.titleRow}>
        <ChartLabel label={chart.label} />
        <Anchor
          size="xl"
          lh="xs"
          fw="bold"
          style={{
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}
          component={NavLink}
          to={routes.leaderboard.sharedChart.getPath({ sharedChartId: chart.id })}
        >
          {chart.songName}
        </Anchor>
        <Text component="span" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
          {chart.difficulty ? `(${chart.difficulty.toFixed(1)})` : ''}
        </Text>
        <Anchor
          href={`https://youtube.com/results?${qs.stringify({
            search_query: `${chart.songName} ${chart.label}`.replace(/( -)|(- )/g, ' '),
          })}`}
          target="_blank"
          rel="noopener noreferrer"
          fz="xl"
          lh={0}
        >
          <FaYoutube />
        </Anchor>
      </Group>
      <Group p={0} gap="sm" align="center" wrap="wrap" className={css.actionsRow}>
        {chart.inTournament && (
          <Tooltip label={lang.TOURNAMENT_CHART}>
            <Anchor component={NavLink} to={routes.tournaments.path} fz="l" lh={0} c="gold">
              <FaTrophy />
            </Anchor>
          </Tooltip>
        )}
        {otherInstances.map((instance) => {
          if (instance.level === chart.level) {
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
    </Group>
  );
};
