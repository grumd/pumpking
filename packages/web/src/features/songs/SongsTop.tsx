import { Group, SimpleGrid, Table, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { FaPlay } from 'react-icons/fa';

import { Card } from 'components/Card/Card';
import Loader from 'components/Loader/Loader';
import { PageContainer } from 'components/PageContainer/PageContainer';
import { Place } from 'components/Place/Place';

import { useLanguage } from 'utils/context/translation';
import { getLongTimeAgo } from 'utils/timeAgo';
import { api } from 'utils/trpc';

import css from './songs-top.module.css';

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
    <Card title={title}>
      {isLoading && <Loader />}
      {!isLoading && data && (
        <Table variant="rows">
          <Table.Tbody>
            {data.map((item, index) => (
              <Table.Tr key={item.id}>
                <Table.Td className={css.place}>
                  <Place place={index + 1} medals />
                </Table.Td>
                <Table.Td>{item.full_name}</Table.Td>
                <Table.Td className={css.rightSide} ta="right">{renderRightSide(item, index)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Card>
  );
}

interface PlaycountProps {
  count: number;
}

function Playcount({ count }: PlaycountProps): JSX.Element {
  return (
    <Group gap="xxs" justify="flex-end" wrap="nowrap" fw={600}>
      <FaPlay size="0.6em" />
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
    <PageContainer>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
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
    </PageContainer>
  );
}
