import { Container, Flex, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { FaPlay } from 'react-icons/fa';

import { Card } from 'components/Card/Card';
import Loader from 'components/Loader/Loader';

import { useLanguage } from 'utils/context/translation';
import { getLongTimeAgo } from 'utils/timeAgo';
import { api } from 'utils/trpc';

interface TrackListItem {
  id: number;
  full_name: string;
}

interface TrackListProps<T extends TrackListItem> {
  title: string;
  data: T[] | undefined;
  isLoading: boolean;
  renderRightSide: (item: T, index: number) => React.ReactNode;
}

function TrackList<T extends TrackListItem>({
  title,
  data,
  isLoading,
  renderRightSide,
}: TrackListProps<T>): JSX.Element {
  return (
    <Card title={title} p="sm">
      {isLoading && <Loader />}
      {!isLoading && data && (
        <Stack component="ol" gap="xxs" p={0} m={0} style={{ listStyle: 'none' }}>
          {data.map((item, index) => (
            <Card key={item.id} component="li" level={2} p="xs" pt="xxs" pb="xxs">
              <Flex align="center" gap="sm">
                <Text
                  fw={index < 3 ? 700 : 400}
                  c={
                    index === 0
                      ? 'yellow.4'
                      : index === 1
                      ? 'gray.4'
                      : index === 2
                      ? 'orange.6'
                      : 'dimmed'
                  }
                  w="1.6em"
                >
                  {index + 1}.
                </Text>
                <Text flex={1}>{item.full_name}</Text>
                {renderRightSide(item, index)}
              </Flex>
            </Card>
          ))}
        </Stack>
      )}
    </Card>
  );
}

interface PlaycountProps {
  count: number;
}

function Playcount({ count }: PlaycountProps): JSX.Element {
  return (
    <Group gap="xs" fw={600}>
      <FaPlay style={{ fontSize: '60%' }} />
      <span>{count}</span>
    </Group>
  );
}

interface LastPlayedProps {
  date: Date | null;
  neverLabel: string;
}

function LastPlayed({ date, neverLabel }: LastPlayedProps): JSX.Element {
  const lang = useLanguage();
  return (
    <Text fz="sm" c="dimmed">
      {date ? getLongTimeAgo(lang, new Date(date)) : neverLabel}
    </Text>
  );
}

export default function SongsTop(): JSX.Element {
  const lang = useLanguage();

  const mostPlayed = useQuery(api.tracks.mostPlayed.queryOptions());
  const mostPlayedMonthly = useQuery(api.tracks.mostPlayedMonthly.queryOptions());
  const leastRecentlyPlayed = useQuery(api.tracks.leastRecentlyPlayed.queryOptions());
  const leastPlayed = useQuery(api.tracks.leastPlayed.queryOptions());

  return (
    <Container component="main" size="md" p="sm">
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <TrackList
          title={lang.TOP_POPULAR_TRACKS}
          data={mostPlayed.data}
          isLoading={mostPlayed.isLoading}
          renderRightSide={(item) => <Playcount count={item.countplay} />}
        />
        <TrackList
          title={lang.MONTHLY_TOP_POPULAR_TRACKS}
          data={mostPlayedMonthly.data}
          isLoading={mostPlayedMonthly.isLoading}
          renderRightSide={(item) => <Playcount count={item.countplay} />}
        />
        <TrackList
          title={lang.TRACKS_PLAYED_LONG_TIME_AGO}
          data={leastRecentlyPlayed.data}
          isLoading={leastRecentlyPlayed.isLoading}
          renderRightSide={(item) => (
            <LastPlayed
              date={item.last_play ? new Date(item.last_play) : null}
              neverLabel={lang.NEVER}
            />
          )}
        />
        <TrackList
          title={lang.LEAST_PLAYED_TRACKS}
          data={leastPlayed.data}
          isLoading={leastPlayed.isLoading}
          renderRightSide={(item) => <Playcount count={item.countplay} />}
        />
      </SimpleGrid>
    </Container>
  );
}
