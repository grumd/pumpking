import { Badge, Button, Group, Stack, Table, Text, TextInput } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FaRedo, FaSearch } from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';

import Loader from 'components/Loader/Loader';

import { routes } from 'constants/routes';

import { api } from 'utils/trpc';

import { useAdminAction } from '../activity/activity';
import { DetailDrawer } from '../components/DetailDrawer';
import { formatDate, formatNumber } from '../scoring';
import { PurgatoryDetail } from './PurgatoryDetail';

// Results ingestion couldn't accept, with the reason. Fix a row (or the arcade names /
// chart it failed on) and recheck it: a valid row moves to results
export const PurgatoryTab = (): JSX.Element => {
  const navigate = useNavigate();
  const params = useParams();
  const openId = params.id ? Number(params.id) : null;
  const [filter, setFilter] = useState('');

  const list = useQuery(api.admin.purgatory.list.queryOptions());
  const recheckAll = useAdminAction(
    api.admin.purgatory.recheck.mutationOptions(),
    () => 'Recheck all of purgatory'
  );

  const pattern = filter.trim().toLowerCase();
  const rows = (list.data ?? []).filter(
    (row) =>
      !pattern ||
      [row.reason, row.player_name, row.track_name, row.agent_name, String(row.id)].some((text) =>
        text?.toLowerCase().includes(pattern)
      )
  );

  // After a row leaves purgatory, the next one opens, to work through the list
  const openNext = () => {
    const index = rows.findIndex((row) => row.id === openId);
    const next = rows[index + 1] ?? rows[index - 1];
    navigate(
      next && next.id !== openId
        ? routes.admin.purgatory.getPath({ id: next.id })
        : routes.admin.purgatory.path
    );
  };

  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <TextInput
          placeholder="Filter by reason, player, track, agent"
          leftSection={<FaSearch />}
          value={filter}
          onChange={(event) => setFilter(event.currentTarget.value)}
          w="24rem"
        />
        <Group gap="xs">
          <Text size="sm" c="dimmed">
            {list.data && `${rows.length} of ${list.data.length} rows`}
          </Text>
          <Button
            leftSection={<FaRedo />}
            loading={recheckAll.isPending}
            disabled={!list.data?.length}
            onClick={() => recheckAll.mutate({})}
            title="Rechecks every row: valid ones move to results"
          >
            Recheck all
          </Button>
        </Group>
      </Group>

      {list.isLoading && <Loader />}
      {list.data?.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">
          Purgatory is empty
        </Text>
      )}
      {rows.length > 0 && (
        <Table highlightOnHover verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>#</Table.Th>
              <Table.Th>Added</Table.Th>
              <Table.Th>Agent</Table.Th>
              <Table.Th>Player</Table.Th>
              <Table.Th>Track</Table.Th>
              <Table.Th ta="right">Score</Table.Th>
              <Table.Th>Reason</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row) => (
              <Table.Tr
                key={row.id}
                onClick={() => navigate(routes.admin.purgatory.getPath({ id: row.id }))}
                style={{ cursor: 'pointer' }}
                bg={row.id === openId ? 'dark.5' : undefined}
              >
                <Table.Td>{row.id}</Table.Td>
                <Table.Td style={{ whiteSpace: 'nowrap' }}>{formatDate(row.added)}</Table.Td>
                <Table.Td>{row.agent_name ?? `#${row.agent}`}</Table.Td>
                <Table.Td>{row.player_name}</Table.Td>
                <Table.Td>
                  {row.track_name}{' '}
                  <Badge variant="default" size="sm">
                    {row.chart_label}
                  </Badge>
                </Table.Td>
                <Table.Td ta="right">{formatNumber(row.score)}</Table.Td>
                <Table.Td>
                  <Text size="sm" c="red.3" lineClamp={2}>
                    {row.reason}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <DetailDrawer
        opened={openId != null}
        onClose={() => navigate(routes.admin.purgatory.path)}
        title={`Purgatory #${openId}`}
        wide
      >
        {openId != null && <PurgatoryDetail key={openId} id={openId} onResolved={openNext} />}
      </DetailDrawer>
    </Stack>
  );
};
