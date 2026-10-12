import type { ApiOutputs } from '@/api/trpc/router';
import { Anchor, Group, Switch, Table, Text, VisuallyHidden } from '@mantine/core';
import _ from 'lodash/fp';
import { GiQueenCrown } from 'react-icons/gi';
import { NavLink } from 'react-router-dom';

import { EmptyState } from 'components/EmptyState/EmptyState';
import { ExpRankImg } from 'components/ExpRankImg/ExpRankImg';
import { Flag } from 'components/Flag/Flag';
import Loader from 'components/Loader/Loader';
import { MedalCounts } from 'components/Medal/Medal';
import { Place } from 'components/Place/Place';

import { routes } from 'constants/routes';

import { usePreferencesMutation } from 'hooks/usePreferencesMutation';

import { useLanguage } from 'utils/context/translation';

import css from './ranking-list.module.css';

type PlayerStats = ApiOutputs['players']['stats'][number];
type UserData = ApiOutputs['user']['current'];
type Preferences = NonNullable<UserData>['preferences'];

interface RankingListProps {
  ranking: PlayerStats[] | undefined;
  isLoading: boolean;
  preferences: Preferences | undefined;
}

export default function RankingList({ ranking, isLoading, preferences }: RankingListProps) {
  const lang = useLanguage();
  const preferencesMutation = usePreferencesMutation();

  if (isLoading) {
    return <Loader />;
  }

  if (!ranking || _.isEmpty(ranking)) {
    return <EmptyState>{lang.NOTHING_FOUND}</EmptyState>;
  }

  return (
    <Table variant="rows">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>{lang.RANK}</Table.Th>
          <Table.Th>{lang.EXP}</Table.Th>
          <Table.Th>{lang.NAME}</Table.Th>
          <Table.Th visibleFrom="md">{lang.AMPASS}</Table.Th>
          <Table.Th ta="right">pp</Table.Th>
          <Table.Th visibleFrom="md" ta="right">
            {lang.PLAYCOUNT}
          </Table.Th>
          <Table.Th visibleFrom="md" ta="right">
            {lang.SCORES_count}
          </Table.Th>
          <Table.Th visibleFrom="md" ta="right">
            {lang.ACCURACY}
          </Table.Th>
          <Table.Th>{lang.TOURNAMENT_CUPS}</Table.Th>
          <Table.Th />
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {ranking.map((player, playerIndex) => {
          const isHidden = preferences?.playersHiddenStatus?.[player.id];
          const isRegionHidden = player.region && preferences?.hiddenRegions?.[player.region];
          if ((isHidden || isRegionHidden) && !preferences?.showHiddenPlayersInRanking) {
            return null;
          }
          const profilePath = routes.profile.getPath({ id: player.id });

          return (
            <Table.Tr
              key={player.id}
              className={css.row}
              data-hidden={isHidden || isRegionHidden || undefined}
            >
              <Table.Td data-fit>
                {playerIndex === 0 ? (
                  <Text span fz="xl" c="gold" className={css.crown}>
                    <GiQueenCrown />
                    <VisuallyHidden>#1</VisuallyHidden>
                  </Text>
                ) : (
                  <Place place={playerIndex + 1} medals />
                )}
              </Table.Td>
              <Table.Td data-fit>
                {player.exp != null ? (
                  <div className={css.expRank}>
                    <ExpRankImg exp={player.exp} />
                  </div>
                ) : null}
              </Table.Td>
              <Table.Td>
                <Group gap="xxs" wrap="nowrap">
                  {player.region ? <Flag region={player.region} /> : null}
                  <Anchor component={NavLink} to={profilePath}>
                    {player.nickname}
                  </Anchor>
                </Group>
              </Table.Td>
              <Table.Td visibleFrom="md">
                <Anchor component={NavLink} to={profilePath}>
                  {player.arcade_name}
                </Anchor>
              </Table.Td>
              <Table.Td data-fit ta="right" fw={700} c="var(--pk-text-strong)">
                {player.pp != null ? Math.floor(player.pp) : ''}
              </Table.Td>
              <Table.Td visibleFrom="md" ta="right" fz="sm" c="dimmed">
                {player.results_count}
              </Table.Td>
              <Table.Td visibleFrom="md" ta="right" fz="sm" c="dimmed">
                {player.best_results_count}
              </Table.Td>
              <Table.Td visibleFrom="md" ta="right" fz="sm" c="dimmed">
                {player.accuracy ? `${player.accuracy.toFixed(2)}%` : ''}
              </Table.Td>
              <Table.Td data-fit>
                <MedalCounts cups={player.cups} />
              </Table.Td>
              <Table.Td data-fit>
                <Switch
                  aria-label={lang.SHOW_IN_RANKING}
                  onChange={() => {
                    if (preferences) {
                      preferencesMutation.mutate(
                        _.set(['playersHiddenStatus', player.id], !isHidden, preferences)
                      );
                    }
                  }}
                  checked={!isHidden}
                />
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
