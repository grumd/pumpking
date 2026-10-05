import type { ApiOutputs } from '@/api/trpc/router';
import { Badge, Button, Group, NumberInput, Stack, Table, Text } from '@mantine/core';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import Loader from 'components/Loader/Loader';

import { api } from 'utils/trpc';

import { useAdminAction } from '../activity/activity';
import { DetailDrawer } from '../components/DetailDrawer';
import { Section } from '../components/layout';
import { ResultDetail } from '../results/ResultDetail';
import { formatDate, formatNumber } from '../scoring';

type ChartInstance = ApiOutputs['admin']['tracks']['get']['charts'][number]['instances'][number];
type ChartResult = ApiOutputs['admin']['tracks']['chartResults']['rows'][number];

// A chart instance: its step range, and its newest results. A result opens in a window on
// top of this one
export const ChartInstanceDetail = ({ instance }: { instance: ChartInstance }): JSX.Element => {
  const [openResultId, setOpenResultId] = useState<number | null>(null);

  return (
    <Stack gap="lg">
      <StepsForm instance={instance} />
      <ChartResults
        instance={instance}
        openResultId={openResultId}
        onOpenResult={setOpenResultId}
      />

      <DetailDrawer
        opened={openResultId != null}
        onClose={() => setOpenResultId(null)}
        title={`Result #${openResultId}`}
        wide
      >
        {openResultId != null && (
          <ResultDetail
            key={openResultId}
            id={openResultId}
            onDeleted={() => setOpenResultId(null)}
          />
        )}
      </DetailDrawer>
    </Stack>
  );
};

const StepsForm = ({ instance }: { instance: ChartInstance }) => {
  const [min, setMin] = useState<number | null>(instance.min_total_steps);
  const [max, setMax] = useState<number | null>(instance.max_total_steps);
  const isDirty = min !== instance.min_total_steps || max !== instance.max_total_steps;
  const save = useAdminAction(
    api.admin.tracks.updateChartSteps.mutationOptions(),
    () => `Edit steps of chart #${instance.id}`
  );

  useEffect(() => {
    setMin(instance.min_total_steps);
    setMax(instance.max_total_steps);
  }, [instance.min_total_steps, instance.max_total_steps]);

  const stepsInput = (
    label: string,
    value: number | null,
    onChange: (v: number | null) => void
  ) => (
    <NumberInput
      label={label}
      value={value ?? ''}
      onChange={(v) => onChange(typeof v === 'number' ? v : null)}
      allowDecimal={false}
      allowNegative={false}
      hideControls
      w="8rem"
    />
  );

  return (
    <Section title="Steps">
      <Text size="xs" c="dimmed">
        The range of step counts (perfect to miss) a result on the chart may have. Empty: not known
        yet, ingestion learns it from results.
      </Text>
      <Group align="flex-end" gap="xs">
        {stepsInput('Min steps', min, setMin)}
        {stepsInput('Max steps', max, setMax)}
        {isDirty && (
          <Button
            variant="default"
            onClick={() => {
              setMin(instance.min_total_steps);
              setMax(instance.max_total_steps);
            }}
          >
            Undo changes
          </Button>
        )}
        <Button
          loading={save.isPending}
          disabled={!isDirty}
          onClick={() =>
            save.mutate({ chartInstanceId: instance.id, minTotalSteps: min, maxTotalSteps: max })
          }
        >
          Save steps
        </Button>
      </Group>
    </Section>
  );
};

// The sum of the result's steps, if it has them all
const totalSteps = (result: ChartResult) => {
  const counts = [result.perfects, result.greats, result.goods, result.bads, result.misses];
  return counts.every((count) => count != null)
    ? counts.reduce<number>((sum, count) => sum + (count ?? 0), 0)
    : null;
};

const ChartResults = ({
  instance,
  openResultId,
  onOpenResult,
}: {
  instance: ChartInstance;
  openResultId: number | null;
  onOpenResult: (id: number) => void;
}) => {
  // The newest 200, then 500 more at a time
  const results = useInfiniteQuery(
    api.admin.tracks.chartResults.infiniteQueryOptions(
      { chartInstanceId: instance.id },
      { getNextPageParam: (lastPage) => lastPage.nextCursor }
    )
  );
  const rows = results.data?.pages.flatMap((page) => page.rows) ?? [];

  const isOutOfRange = (steps: number) =>
    (instance.min_total_steps != null && steps < instance.min_total_steps) ||
    (instance.max_total_steps != null && steps > instance.max_total_steps);

  return (
    <Section title="Results">
      {results.isLoading && <Loader />}
      {results.error && <Text c="red">{results.error.message}</Text>}
      {results.data && (
        <>
          <Text size="xs" c="dimmed">
            {rows.length < instance.resultsCount
              ? `The newest ${rows.length} of ${formatNumber(instance.resultsCount)} results`
              : `${rows.length} results, newest first`}
            . ◆: the result&apos;s steps, red when outside the chart&apos;s range.
          </Text>
          <Table highlightOnHover verticalSpacing={4}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>#</Table.Th>
                <Table.Th>Played</Table.Th>
                <Table.Th>Player</Table.Th>
                <Table.Th ta="right">Score</Table.Th>
                <Table.Th>Grade</Table.Th>
                <Table.Th ta="right">◆</Table.Th>
                <Table.Th>Agent</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((row) => {
                const steps = totalSteps(row);
                return (
                  <Table.Tr
                    key={row.id}
                    onClick={() => onOpenResult(row.id)}
                    style={{ cursor: 'pointer' }}
                    bg={row.id === openResultId ? 'dark.5' : undefined}
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
                    <Table.Td ta="right">{formatNumber(row.score)}</Table.Td>
                    <Table.Td>
                      {row.grade} {row.plate}
                    </Table.Td>
                    <Table.Td
                      ta="right"
                      c={steps != null && isOutOfRange(steps) ? 'red' : undefined}
                    >
                      {steps ?? '—'}
                    </Table.Td>
                    <Table.Td>{row.agent < 0 ? 'web' : row.agent_name ?? `#${row.agent}`}</Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
          {results.hasNextPage && (
            <Group justify="center">
              <Button
                variant="default"
                loading={results.isFetchingNextPage}
                onClick={() => results.fetchNextPage()}
              >
                Load 500 more
              </Button>
            </Group>
          )}
        </>
      )}
    </Section>
  );
};
