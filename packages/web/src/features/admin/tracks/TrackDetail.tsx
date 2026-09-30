import type { ApiOutputs } from '@/api/trpc/router';
import { Badge, Button, Group, NumberInput, SimpleGrid, Stack, Table, Text } from '@mantine/core';
import { MIX_NAME_BY_ID } from '@pumpking/core/constants/mixes';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import Loader from 'components/Loader/Loader';

import { api } from 'utils/trpc';

import { useAdminAction } from '../activity/activity';
import { ArcadeNamesEditor } from '../components/ArcadeNamesEditor';
import { Info, Section } from '../components/layout';
import { useEditForm } from '../hooks/useEditForm';

type Track = ApiOutputs['admin']['tracks']['get'];
type ChartInstance = Track['charts'][number]['instances'][number];

interface TrackDetailProps {
  id: number;
  // A chart instance to point out, e.g. the one a purgatory reason is about
  highlightChartId?: number;
}

export const TrackDetail = ({ id, highlightChartId }: TrackDetailProps): JSX.Element => {
  const track = useQuery(api.admin.tracks.get.queryOptions({ id }, { retry: false }));
  if (track.isLoading) {
    return <Loader />;
  }
  if (!track.data) {
    return <Text c="dimmed">{track.error?.message ?? 'Not found'}</Text>;
  }
  return <TrackView track={track.data} highlightChartId={highlightChartId} />;
};

const TrackView = ({ track, highlightChartId }: { track: Track; highlightChartId?: number }) => {
  const form = useEditForm({ arcadeNames: track.arcadeNames });
  const saveNames = useAdminAction(
    api.admin.tracks.saveArcadeNames.mutationOptions(),
    () => `Edit arcade names of track #${track.id}`
  );

  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <Stack gap="xs">
          <SimpleGrid cols={2} spacing="xs">
            <Info label="Full name" value={track.full_name} />
            <Info label="Short name" value={track.short_name ?? '—'} />
            <Info label="External id" value={track.external_id} />
            <Info label="Duration" value={track.duration ?? '—'} />
          </SimpleGrid>
          <Text size="xs" c="dimmed">
            Names, charts and labels come from the tracklist: change them with a tracklist sync.
          </Text>
        </Stack>

        <Section title="Arcade names">
          <ArcadeNamesEditor
            value={form.values.arcadeNames}
            onChange={(v) => form.set('arcadeNames', v)}
            defaultEdist={1}
          />
          <Group justify="flex-end" gap="xs">
            {form.isDirty && (
              <Button variant="default" onClick={form.reset}>
                Undo changes
              </Button>
            )}
            <Button
              loading={saveNames.isPending}
              disabled={!form.isDirty}
              onClick={() =>
                saveNames.mutate({ id: track.id, arcadeNames: form.values.arcadeNames })
              }
            >
              Save arcade names
            </Button>
          </Group>
        </Section>
      </SimpleGrid>

      <Section title="Charts">
        <Text size="xs" c="dimmed">
          Steps: the range of step counts (perfect to miss) a result on the chart may have.
          Ingestion learns it from results and sends results outside it (± 1) to purgatory.
        </Text>
        <Table verticalSpacing={4} horizontalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Chart</Table.Th>
              <Table.Th>Mix</Table.Th>
              <Table.Th>#</Table.Th>
              <Table.Th w="7rem">Min steps</Table.Th>
              <Table.Th w="7rem">Max steps</Table.Th>
              <Table.Th w="5rem" />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {track.charts.flatMap((chart) =>
              chart.instances.map((instance, index) => (
                <ChartStepsRow
                  key={instance.id}
                  instance={instance}
                  // The chart's label and type on its first row only
                  chart={index === 0 ? chart : null}
                  highlighted={instance.id === highlightChartId}
                />
              ))
            )}
          </Table.Tbody>
        </Table>
      </Section>
    </Stack>
  );
};

interface ChartStepsRowProps {
  instance: ChartInstance;
  chart: Track['charts'][number] | null;
  highlighted: boolean;
}

const ChartStepsRow = ({ instance, chart, highlighted }: ChartStepsRowProps) => {
  const [min, setMin] = useState<number | null>(instance.min_total_steps);
  const [max, setMax] = useState<number | null>(instance.max_total_steps);
  const rowRef = useRef<HTMLTableRowElement>(null);
  const isDirty = min !== instance.min_total_steps || max !== instance.max_total_steps;
  const save = useAdminAction(
    api.admin.tracks.updateChartSteps.mutationOptions(),
    () => `Edit steps of chart #${instance.id}`
  );

  useEffect(() => {
    setMin(instance.min_total_steps);
    setMax(instance.max_total_steps);
  }, [instance.min_total_steps, instance.max_total_steps]);

  useEffect(() => {
    if (highlighted) {
      rowRef.current?.scrollIntoView({ block: 'center' });
    }
  }, [highlighted]);

  const stepsInput = (value: number | null, onChange: (v: number | null) => void) => (
    <NumberInput
      size="xs"
      value={value ?? ''}
      onChange={(v) => onChange(typeof v === 'number' ? v : null)}
      allowDecimal={false}
      allowNegative={false}
      hideControls
    />
  );

  return (
    <Table.Tr
      ref={rowRef}
      style={highlighted ? { background: 'var(--mantine-color-red-light)' } : undefined}
    >
      <Table.Td>
        {chart && (
          <Group gap={4}>
            <Text size="sm" fw={600}>
              {instance.label}
            </Text>
            <Badge variant="default" size="xs">
              {chart.type}
            </Badge>
          </Group>
        )}
        {!chart && <Text size="sm">{instance.label}</Text>}
      </Table.Td>
      <Table.Td>
        <Text size="sm">{MIX_NAME_BY_ID[instance.mix] ?? `#${instance.mix}`}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="xs" c="dimmed">
          {instance.id}
        </Text>
      </Table.Td>
      <Table.Td>{stepsInput(min, setMin)}</Table.Td>
      <Table.Td>{stepsInput(max, setMax)}</Table.Td>
      <Table.Td>
        {isDirty && (
          <Button
            size="compact-xs"
            loading={save.isPending}
            onClick={() =>
              save.mutate({ chartInstanceId: instance.id, minTotalSteps: min, maxTotalSteps: max })
            }
          >
            Save
          </Button>
        )}
      </Table.Td>
    </Table.Tr>
  );
};
