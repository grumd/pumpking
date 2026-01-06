import { Anchor, Badge, Group, Text } from '@mantine/core';
import qs from 'query-string';
import { FaYoutube } from 'react-icons/fa';
import { NavLink } from 'react-router-dom';

import { ChartLabel } from 'components/ChartLabel/ChartLabel';

import { colorByMix } from 'constants/colors';
import { routes } from 'constants/routes';

import type { ChartApiOutput } from 'features/leaderboards/hooks/useChartsQuery';

import { labelToTypeLevel } from 'utils/leaderboards';
import { Mixes } from 'utils/scoring/grades';

interface ChartHeaderProps {
  chart: ChartApiOutput;
  children?: React.ReactNode;
}

export const ChartHeader = ({ chart, children = null }: ChartHeaderProps): JSX.Element => {
  // TODO: change to "toSorted" when more widely supported
  const otherInstances = chart.otherChartInstances.slice().sort((a, b) => b.mix - a.mix);
  const [chartType, chartLevel] = labelToTypeLevel(chart.label);

  return (
    <Group p="xs" bdrs="xl" gap="sm" align="center" wrap="nowrap">
      <ChartLabel type={chartType} level={chartLevel ?? '?'} />
      <Anchor
        size="xl"
        lh="xs"
        fw="bold"
        style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}
        component={NavLink}
        to={routes.leaderboard.sharedChart.getPath({ sharedChartId: chart.id })}
      >
        {chart.songName}
      </Anchor>{' '}
      <Text component="span" c="dimmed">
        {chart.difficulty ? `(${chart.difficulty.toFixed(1)}) ` : ''}
      </Text>
      <Anchor
        href={`https://youtube.com/results?${qs.stringify({
          search_query: `${chart.songName} ${chart.label}`.replace(/( -)|(- )/g, ' '),
        })}`}
        target="_blank"
        rel="noopener noreferrer"
        fz="xl"
        lh={1}
      >
        <FaYoutube />
      </Anchor>
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
  );
};
