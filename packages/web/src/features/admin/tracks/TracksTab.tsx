import { Badge, Button, Group, NumberInput, Stack, Table, Text, TextInput } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { FaSearch, FaSync } from 'react-icons/fa';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import Loader from 'components/Loader/Loader';

import { routes } from 'constants/routes';

import { api } from 'utils/trpc';

import { DetailDrawer } from '../components/DetailDrawer';
import { MIX_OPTIONS_WITH_ARCADE_NAMES } from '../scoring';
import { TrackDetail } from './TrackDetail';
import { TracklistSyncModal } from './TracklistSyncModal';

const LIMIT = 200;

// All tracks, filtered by name (kept in the URL as ?q=), with their arcade names. A track
// opens with its charts; a chart can be looked up by its id
export const TracksTab = (): JSX.Element => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = useParams();
  const openId = params.id ? Number(params.id) : null;
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get('q') ?? '';
  const highlightChartId = Number(searchParams.get('chart')) || undefined;
  const [chartId, setChartId] = useState<string | number>('');
  const [syncOpened, sync] = useDisclosure(false);

  const tracks = useQuery(api.admin.tracks.list.queryOptions());
  const pattern = filter.trim().toLowerCase();
  const matching = (tracks.data ?? []).filter(
    (track) =>
      !pattern ||
      String(track.id) === pattern ||
      [
        track.full_name,
        track.short_name,
        track.external_id,
        ...Object.values(track.arcadeNames).map((name) => name?.name),
      ].some((name) => name?.toLowerCase().includes(pattern))
  );
  const listPath = {
    pathname: routes.admin.tracks.path,
    search: filter ? `?q=${encodeURIComponent(filter)}` : '',
  };

  const onFindChart = async (event: FormEvent) => {
    event.preventDefault();
    if (typeof chartId !== 'number') {
      return;
    }
    try {
      const { trackId } = await queryClient.fetchQuery(
        api.admin.tracks.byChartInstance.queryOptions({ chartInstanceId: chartId })
      );
      navigate(routes.admin.tracks.getPath({ id: trackId, chartInstanceId: chartId }));
    } catch (error) {
      notifications.show({ color: 'red', message: (error as Error).message });
    }
  };

  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Group gap="xs">
          <TextInput
            placeholder="Filter by name, external id or arcade name"
            leftSection={<FaSearch />}
            value={filter}
            onChange={(event) =>
              setSearchParams(event.currentTarget.value ? { q: event.currentTarget.value } : {}, {
                replace: true,
              })
            }
            w="24rem"
          />
          <form onSubmit={onFindChart}>
            <Group gap="xs">
              <NumberInput
                placeholder="Chart #"
                value={chartId}
                onChange={setChartId}
                allowDecimal={false}
                allowNegative={false}
                hideControls
                w="7rem"
              />
              <Button type="submit" variant="default" disabled={typeof chartId !== 'number'}>
                Open chart
              </Button>
            </Group>
          </form>
        </Group>
        <Group gap="xs">
          <Text size="sm" c="dimmed">
            {tracks.data && `${matching.length} of ${tracks.data.length} tracks`}
          </Text>
          <Button leftSection={<FaSync />} onClick={sync.open}>
            Sync tracklist
          </Button>
        </Group>
      </Group>

      {tracks.isLoading && <Loader />}
      {tracks.data && (
        <Table highlightOnHover verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>#</Table.Th>
              <Table.Th>Track</Table.Th>
              <Table.Th>External id</Table.Th>
              {MIX_OPTIONS_WITH_ARCADE_NAMES.map((mix) => (
                <Table.Th key={mix.id}>{mix.name}</Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {matching.slice(0, LIMIT).map((track) => (
              <Table.Tr
                key={track.id}
                onClick={() =>
                  navigate({
                    pathname: routes.admin.tracks.getPath({ id: track.id }),
                    search: listPath.search,
                  })
                }
                style={{ cursor: 'pointer' }}
                bg={track.id === openId ? 'dark.5' : undefined}
              >
                <Table.Td>{track.id}</Table.Td>
                <Table.Td>
                  {track.full_name}{' '}
                  {track.duration && track.duration !== 'Standard' && (
                    <Badge variant="default" size="sm">
                      {track.duration}
                    </Badge>
                  )}
                </Table.Td>
                <Table.Td ff="monospace" fz="sm">
                  {track.external_id}
                </Table.Td>
                {MIX_OPTIONS_WITH_ARCADE_NAMES.map((mix) => (
                  <Table.Td key={mix.id} fz="sm">
                    {track.arcadeNames[mix.id]?.name}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
      {matching.length > LIMIT && (
        <Text size="sm" c="dimmed" ta="center">
          Showing {LIMIT} of {matching.length}: filter to find the others
        </Text>
      )}

      <DetailDrawer
        opened={openId != null}
        onClose={() => navigate(listPath)}
        title={`Track #${openId}`}
        wide
      >
        {openId != null && (
          <TrackDetail key={openId} id={openId} highlightChartId={highlightChartId} />
        )}
      </DetailDrawer>
      <TracklistSyncModal opened={syncOpened} onClose={sync.close} />
    </Stack>
  );
};
