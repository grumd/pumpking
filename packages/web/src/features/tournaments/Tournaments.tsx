import type { ApiOutputs } from '@/api/trpc/router';
import {
  Anchor,
  Badge,
  Container,
  Group,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';

import { Card } from 'components/Card/Card';
import { ChartLabel } from 'components/ChartLabel/ChartLabel';
import { Flag } from 'components/Flag/Flag';
import Loader from 'components/Loader/Loader';
import { Medal } from 'components/Medal/Medal';

import { routes } from 'constants/routes';

import { useUser } from 'hooks/useUser';

import { useLanguage } from 'utils/context/translation';
import { Mixes, isMixNumber } from 'utils/scoring/grades';
import { api } from 'utils/trpc';

import { tournamentName } from './tournamentName';

type Tournament = NonNullable<ApiOutputs['tournaments']['get']>;
type Bracket = Tournament['brackets'][number];

const formatScore = (score: number) => score.toLocaleString('en-US');

const skillRange = (bracket: Bracket, unrated: string) => {
  if (bracket.minSkill === null) return `${unrated}, < ${bracket.maxSkill}`;
  if (bracket.maxSkill >= 28) return `${bracket.minSkill}+`;
  return `${bracket.minSkill}–${bracket.maxSkill - 1}`;
};

const BracketView = ({ bracket, playerId }: { bracket: Bracket; playerId?: number }) => {
  const lang = useLanguage();

  return (
    <Stack gap="sm" pt="sm">
      <Card
        title={lang.TOURNAMENT_POOL}
        headerNode={
          <Text size="sm" c="dimmed">
            {lang.SKILL}: {skillRange(bracket, lang.UNRATED)} · {bracket.playerCount}{' '}
            {lang.TOURNAMENT_PLAYERS}
          </Text>
        }
      >
        <Table.ScrollContainer minWidth={420}>
          <Table>
            <Table.Tbody>
              {bracket.charts.map((chart, index) => (
                <Table.Tr key={chart.sharedChartId}>
                  <Table.Td c="dimmed">#{index + 1}</Table.Td>
                  <Table.Td>
                    <Anchor
                      component={NavLink}
                      to={routes.leaderboard.sharedChart.getPath({
                        sharedChartId: chart.sharedChartId,
                      })}
                    >
                      {chart.trackName}
                    </Anchor>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      {chart.instances.map((instance) => (
                        <Stack key={instance.mix} gap={2} align="center">
                          <ChartLabel label={instance.label} />
                          <Text size="xs" c="dimmed">
                            {isMixNumber(instance.mix) ? Mixes[instance.mix] : instance.mix}
                          </Text>
                        </Stack>
                      ))}
                    </Group>
                  </Table.Td>
                  <Table.Td ta="right" c="dimmed" fz="sm">
                    {chart.difficulty !== null &&
                      (Math.floor(chart.difficulty * 10) / 10).toFixed(1)}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      <Card title={lang.TOURNAMENT_LEADERBOARD}>
        {bracket.leaderboard.length === 0 ? (
          <Text c="dimmed">{lang.TOURNAMENT_NO_SCORES}</Text>
        ) : (
          <Table.ScrollContainer minWidth={640}>
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>#</Table.Th>
                  <Table.Th>{lang.PLAYER}</Table.Th>
                  {bracket.charts.map((chart, index) => (
                    <Table.Th key={chart.sharedChartId} ta="right">
                      #{index + 1}
                    </Table.Th>
                  ))}
                  <Table.Th ta="right">{lang.TOTAL}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {bracket.leaderboard.map((entry) => (
                  <Table.Tr
                    key={entry.playerId}
                    bg={entry.playerId === playerId ? 'dark.5' : undefined}
                  >
                    <Table.Td fw="bold">
                      <Group gap={6} wrap="nowrap">
                        {entry.rank}
                        {entry.medal && <Medal medal={entry.medal} />}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xxs" wrap="nowrap">
                        {entry.region && <Flag region={entry.region} />}
                        <Anchor
                          component={NavLink}
                          to={routes.profile.getPath({ id: entry.playerId })}
                        >
                          {entry.nickname}
                        </Anchor>
                      </Group>
                    </Table.Td>
                    {bracket.charts.map((chart) => {
                      const result = entry.charts.find(
                        (c) => c.sharedChartId === chart.sharedChartId
                      );
                      return (
                        <Table.Td
                          key={chart.sharedChartId}
                          ta="right"
                          fw={result?.counted ? 'bold' : undefined}
                          c={result?.counted ? undefined : 'dimmed'}
                        >
                          {result ? formatScore(result.score) : '–'}
                        </Table.Td>
                      );
                    })}
                    <Table.Td ta="right" fw="bold">
                      {formatScore(entry.total)}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>
    </Stack>
  );
};

const PlayerSummary = ({ tournament, playerId }: { tournament: Tournament; playerId?: number }) => {
  const lang = useLanguage();
  const { playerBracket } = tournament;
  const bracket = tournament.brackets.find((b) => b.id === playerBracket?.bracketId);

  if (!playerBracket || !bracket) {
    return <Text>{lang.TOURNAMENT_NOT_PARTICIPATING}</Text>;
  }

  const entry = bracket.leaderboard.find((e) => e.playerId === playerId);

  return (
    <Text>
      {lang.TOURNAMENT_YOUR_BRACKET}: <b>{lang.TOURNAMENT_BRACKET(bracket.code)}</b>
      {playerBracket.skillLevel !== null &&
        ` (${lang.TOURNAMENT_PLACEMENT(playerBracket.skillLevel)})`}
      {entry && (
        <>
          {' · '}
          {lang.TOURNAMENT_PLACE}: <b>{entry.rank}</b> · {lang.TOTAL}:{' '}
          <b>{formatScore(entry.total)}</b>
        </>
      )}
    </Text>
  );
};

const TournamentView = ({ tournament }: { tournament: Tournament }) => {
  const lang = useLanguage();
  const { data: user } = useUser();
  const isLive = tournament.state === 'Live';
  const lastMinute = new Date(tournament.endDate.getTime() - 60 * 1000);
  const defaultBracket = tournament.playerBracket?.bracketId ?? tournament.brackets[0]?.id;

  return (
    <Stack gap="sm">
      <Card>
        <Stack gap="xs">
          <Group gap="sm">
            <Title order={2}>{tournamentName(tournament.startDate)}</Title>
            <Badge color={isLive ? 'green' : 'gray'}>
              {isLive ? lang.TOURNAMENT_LIVE : lang.TOURNAMENT_ENDED}
            </Badge>
          </Group>
          <Text size="sm" c="dimmed">
            {tournament.startDate.toLocaleDateString(undefined, { dateStyle: 'medium' })} –{' '}
            {lastMinute.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
          </Text>
          <PlayerSummary tournament={tournament} playerId={user?.id} />
        </Stack>
      </Card>

      <Tabs key={tournament.id} variant="pills" defaultValue={String(defaultBracket)}>
        <Tabs.List>
          {tournament.brackets.map((bracket) => (
            <Tabs.Tab key={bracket.id} value={String(bracket.id)}>
              {lang.TOURNAMENT_BRACKET(bracket.code)}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        {tournament.brackets.map((bracket) => (
          <Tabs.Panel key={bracket.id} value={String(bracket.id)}>
            <BracketView bracket={bracket} playerId={user?.id} />
          </Tabs.Panel>
        ))}
      </Tabs>
    </Stack>
  );
};

const useClearTournamentNotice = () => {
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  const unread = useQuery(api.notices.unread.queryOptions(undefined, { enabled: !!user }));
  const { mutate } = useMutation(
    api.notices.markRead.mutationOptions({
      onSuccess: (data) => queryClient.setQueryData(api.notices.unread.queryKey(), data),
    })
  );

  useEffect(() => {
    if (unread.data?.tournament) {
      mutate('tournament');
    }
  }, [unread.data?.tournament, mutate]);
};

export default function Tournaments(): JSX.Element {
  const lang = useLanguage();
  useClearTournamentNotice();
  const [tournamentId, setTournamentId] = useState<number | undefined>();
  const list = useQuery(api.tournaments.list.queryOptions());
  const tournament = useQuery(api.tournaments.get.queryOptions({ tournamentId }));

  return (
    <Container component="main" size="lg" p="sm">
      <Stack gap="sm">
        {list.data && list.data.length > 1 && (
          <Select
            w={220}
            allowDeselect={false}
            value={String(tournamentId ?? list.data[0].id)}
            onChange={(value) => setTournamentId(Number(value))}
            data={list.data.map((t) => ({
              value: String(t.id),
              label: tournamentName(t.startDate),
            }))}
          />
        )}
        {tournament.isLoading && <Loader />}
        {tournament.data === null && <Text>{lang.TOURNAMENT_NONE}</Text>}
        {tournament.data && <TournamentView tournament={tournament.data} />}
      </Stack>
    </Container>
  );
}
