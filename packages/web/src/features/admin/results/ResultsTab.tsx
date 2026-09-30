import { Badge, Button, Group, NumberInput, Stack, Table, Text, TextInput } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import Loader from 'components/Loader/Loader';

import { routes } from 'constants/routes';

import { api } from 'utils/trpc';

import { DetailDrawer } from '../components/DetailDrawer';
import { PlayerSelect } from '../components/PlayerSelect';
import { formatDate, formatNumber } from '../scoring';
import { ResultDetail } from './ResultDetail';

const numberParam = (value: string | null) => (value ? Number(value) || undefined : undefined);

interface Search {
  resultId?: number;
  score?: number;
  playerId?: number;
  track?: string;
  chartLabel?: string;
}

// Finds results by id, score, player, track or chart: the newest 100 that match. The
// search is kept in the URL
export const ResultsTab = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const openId = params.id ? Number(params.id) : null;
  const [searchParams, setSearchParams] = useSearchParams();

  const search: Search = {
    resultId: numberParam(searchParams.get('id')),
    score: numberParam(searchParams.get('score')),
    playerId: numberParam(searchParams.get('player')),
    track: searchParams.get('track') || undefined,
    chartLabel: searchParams.get('chart') || undefined,
  };
  const [form, setForm] = useState<Search>(search);

  const results = useQuery(api.admin.results.search.queryOptions(search));

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const next = new URLSearchParams();
    form.resultId && next.set('id', String(form.resultId));
    form.score && next.set('score', String(form.score));
    form.playerId && next.set('player', String(form.playerId));
    form.track && next.set('track', form.track);
    form.chartLabel && next.set('chart', form.chartLabel);
    navigate({ pathname: routes.admin.results.path, search: next.toString() });
  };

  return (
    <Stack gap="sm">
      <form onSubmit={onSubmit}>
        <Group align="flex-end" gap="xs">
          <NumberInput
            label="Result #"
            value={form.resultId ?? ''}
            onChange={(v) => setForm({ ...form, resultId: typeof v === 'number' ? v : undefined })}
            allowDecimal={false}
            allowNegative={false}
            hideControls
            w="7rem"
          />
          <NumberInput
            label="Score"
            value={form.score ?? ''}
            onChange={(v) => setForm({ ...form, score: typeof v === 'number' ? v : undefined })}
            allowDecimal={false}
            allowNegative={false}
            thousandSeparator=","
            hideControls
            w="9rem"
          />
          <PlayerSelect
            label="Player"
            value={form.playerId ?? null}
            onChange={(playerId) => setForm({ ...form, playerId: playerId ?? undefined })}
            w="14rem"
          />
          <TextInput
            label="Track"
            value={form.track ?? ''}
            onChange={(event) =>
              setForm({ ...form, track: event.currentTarget.value || undefined })
            }
            w="14rem"
          />
          <TextInput
            label="Chart"
            placeholder="S21"
            value={form.chartLabel ?? ''}
            onChange={(event) =>
              setForm({ ...form, chartLabel: event.currentTarget.value.toUpperCase() || undefined })
            }
            w="6rem"
          />
          <Button type="submit" leftSection={<FaSearch />}>
            Search
          </Button>
          {searchParams.size > 0 && (
            <Button
              variant="subtle"
              onClick={() => {
                setForm({});
                setSearchParams({});
              }}
            >
              Clear
            </Button>
          )}
        </Group>
      </form>

      {results.isLoading && <Loader />}
      {results.error && <Text c="red">{results.error.message}</Text>}
      {results.data && (
        <>
          <Text size="sm" c="dimmed">
            {results.data.rows.length === results.data.limit
              ? `The newest ${results.data.limit} matching results; narrow the search to see older ones`
              : `${results.data.rows.length} results`}
          </Text>
          <Table highlightOnHover verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>#</Table.Th>
                <Table.Th>Played</Table.Th>
                <Table.Th>Player</Table.Th>
                <Table.Th>Track</Table.Th>
                <Table.Th ta="right">Score</Table.Th>
                <Table.Th>Grade</Table.Th>
                <Table.Th>Agent</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {results.data.rows.map((row) => (
                <Table.Tr
                  key={row.id}
                  onClick={() =>
                    navigate({
                      pathname: routes.admin.results.getPath({ id: row.id }),
                      search: location.search,
                    })
                  }
                  style={{ cursor: 'pointer' }}
                  bg={row.id === openId ? 'dark.5' : undefined}
                >
                  <Table.Td>{row.id}</Table.Td>
                  <Table.Td style={{ whiteSpace: 'nowrap' }}>{formatDate(row.gained)}</Table.Td>
                  <Table.Td>
                    {row.nickname}{' '}
                    {!!row.is_hidden && (
                      <Badge color="gray" size="sm">
                        hidden
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {row.track}{' '}
                    <Badge variant="default" size="sm">
                      {row.chart_label}
                    </Badge>
                  </Table.Td>
                  <Table.Td ta="right">{formatNumber(row.score)}</Table.Td>
                  <Table.Td>
                    {row.grade} {row.plate}
                  </Table.Td>
                  <Table.Td>{row.agent < 0 ? 'web' : row.agent_name ?? `#${row.agent}`}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </>
      )}

      <DetailDrawer
        opened={openId != null}
        onClose={() => navigate({ pathname: routes.admin.results.path, search: location.search })}
        title={`Result #${openId}`}
        wide
      >
        {openId != null && (
          <ResultDetail
            key={openId}
            id={openId}
            onDeleted={() =>
              navigate({ pathname: routes.admin.results.path, search: location.search })
            }
          />
        )}
      </DetailDrawer>
    </Stack>
  );
};
