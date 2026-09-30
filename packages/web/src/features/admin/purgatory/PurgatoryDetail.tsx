import type { ApiOutputs } from '@/api/trpc/router';
import { Alert, Button, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { FaExclamationTriangle } from 'react-icons/fa';
import { Link } from 'react-router-dom';

import Loader from 'components/Loader/Loader';

import { routes } from 'constants/routes';

import { api } from 'utils/trpc';

import { useAdminAction } from '../activity/activity';
import { ConfirmButton } from '../components/ConfirmButton';
import { MediaViewer } from '../components/MediaViewer';
import { NumberField, SelectField, TextField } from '../components/fields';
import { Info, Section } from '../components/layout';
import { useEditForm } from '../hooks/useEditForm';
import {
  PASS_OPTIONS,
  PLATE_OPTIONS,
  formatDate,
  gradeOptions,
  hasPlates,
  mixIdByName,
} from '../scoring';
import { type PurgatoryField, parseReason } from './reason';

interface PurgatoryDetailProps {
  id: number;
  // The row left purgatory (moved to results, discarded or deleted)
  onResolved: () => void;
}

export const PurgatoryDetail = ({ id, onResolved }: PurgatoryDetailProps): JSX.Element => {
  const row = useQuery(api.admin.purgatory.get.queryOptions({ id }, { retry: false }));

  if (row.isLoading) {
    return <Loader />;
  }
  if (!row.data) {
    return <Text c="dimmed">{row.error?.message ?? 'Not found'}: it may have left purgatory</Text>;
  }
  return <PurgatoryForm row={row.data} onResolved={onResolved} />;
};

type Row = ApiOutputs['admin']['purgatory']['get'];

const PurgatoryForm = ({ row, onResolved }: { row: Row; onResolved: () => void }) => {
  const form = useEditForm({
    player_name: row.player_name,
    track_name: row.track_name,
    chart_label: row.chart_label,
    mods_list: row.mods_list,
    score: row.score,
    score_increase: row.score_increase,
    grade: row.grade,
    plate: row.plate,
    is_pass: row.is_pass,
    perfects: row.perfects,
    greats: row.greats,
    goods: row.goods,
    bads: row.bads,
    misses: row.misses,
    max_combo: row.max_combo,
    calories: row.calories,
  });
  const reason = parseReason(row.reason);
  const mixId = mixIdByName(row.mix_name);
  const highlighted = (field: PurgatoryField) => reason.fields.includes(field);

  const onOutcome = ({ outcomes }: { outcomes: { outcome: string }[] }) => {
    if (outcomes[0]?.outcome !== 'stays') {
      onResolved();
    }
  };
  const updateAndRecheck = useAdminAction(
    api.admin.purgatory.updateAndRecheck.mutationOptions({ onSuccess: onOutcome }),
    () => `Save and recheck purgatory #${row.id}`
  );
  const remove = useAdminAction(
    api.admin.purgatory.delete.mutationOptions({ onSuccess: onResolved }),
    () => `Delete purgatory #${row.id}`
  );
  const isBusy = updateAndRecheck.isPending || remove.isPending;

  const field = <K extends keyof typeof form.values>(key: K) => ({
    value: form.values[key],
    onChange: (value: (typeof form.values)[K]) => form.set(key, value),
    highlighted: highlighted(key as PurgatoryField),
  });
  const statsSum = [row.perfects, row.greats, row.goods, row.bads, row.misses].every(
    (v) => v != null
  )
    ? (form.values.perfects ?? 0) +
      (form.values.greats ?? 0) +
      (form.values.goods ?? 0) +
      (form.values.bads ?? 0) +
      (form.values.misses ?? 0)
    : null;

  return (
    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
      <Stack gap="sm">
        <MediaViewer source="purgatory" id={row.id} />
        <SimpleGrid cols={2} spacing="xxs">
          <Info label="Agent" value={row.agent_name ?? `#${row.agent}`} />
          <Info label="Mix" value={row.mix_name} />
          <Info
            label="Played"
            value={formatDate(row.gained) + (row.exact_gain_date ? '' : ' (not exact)')}
          />
          <Info label="Added" value={formatDate(row.added)} />
          <Info label="Recognition notes" value={row.recognition_notes || '—'} />
        </SimpleGrid>
      </Stack>

      <Stack gap="md">
        <Alert color="red" variant="light" icon={<FaExclamationTriangle />} title="Why it's here">
          <Text size="sm">{row.reason}</Text>
          <Group gap="xs" mt="xs">
            {reason.chartInstanceId && <ChartLink chartInstanceId={reason.chartInstanceId} />}
            {reason.playerName && (
              <Button
                size="xs"
                variant="light"
                component={Link}
                to={`${routes.admin.players.path}?q=${encodeURIComponent(reason.playerName)}`}
              >
                Find player '{reason.playerName}'
              </Button>
            )}
          </Group>
        </Alert>

        <Section title="Player and chart">
          <SimpleGrid cols={3} spacing="sm">
            <TextField
              label="Player name"
              {...field('player_name')}
              onChange={(v) => form.set('player_name', v ?? '')}
            />
            <TextField
              label="Track name"
              {...field('track_name')}
              onChange={(v) => form.set('track_name', v ?? '')}
            />
            <TextField
              label="Chart"
              {...field('chart_label')}
              onChange={(v) => form.set('chart_label', v ?? '')}
            />
          </SimpleGrid>
          <TextField label="Mods" {...field('mods_list')} placeholder="e.g. 2x VJ" />
        </Section>

        <Section title="Score">
          <SimpleGrid cols={3} spacing="sm">
            <NumberField label="Score" {...field('score')} />
            <NumberField label="Score increase" {...field('score_increase')} />
            <SelectField label="Grade" {...field('grade')} options={gradeOptions(mixId)} />
            {hasPlates(mixId) && (
              <SelectField label="Plate" {...field('plate')} options={PLATE_OPTIONS} />
            )}
            <SelectField
              label="Pass"
              {...field('is_pass')}
              value={form.values.is_pass == null ? null : String(form.values.is_pass)}
              onChange={(v) => form.set('is_pass', v == null ? null : Number(v))}
              options={PASS_OPTIONS}
            />
          </SimpleGrid>
        </Section>

        <Section
          title="Steps"
          aside={
            statsSum != null && (
              <Text size="xs" c="dimmed">
                {statsSum} steps
              </Text>
            )
          }
        >
          <SimpleGrid cols={4} spacing="sm">
            <NumberField label="Perfect" {...field('perfects')} />
            <NumberField label="Great" {...field('greats')} />
            <NumberField label="Good" {...field('goods')} />
            <NumberField label="Bad" {...field('bads')} />
            <NumberField label="Miss" {...field('misses')} />
            <NumberField label="Max combo" {...field('max_combo')} />
            <NumberField label="Calories" {...field('calories')} />
          </SimpleGrid>
        </Section>

        <Group justify="space-between" mt="xs">
          <ConfirmButton
            question={`Delete purgatory #${row.id}? The result is lost.`}
            confirmLabel="Delete"
            onConfirm={() => remove.mutate({ id: row.id })}
            disabled={isBusy}
          >
            Delete
          </ConfirmButton>
          <Group gap="xs">
            {form.isDirty && (
              <Button variant="default" onClick={form.reset} disabled={isBusy}>
                Undo changes
              </Button>
            )}
            <Button
              loading={updateAndRecheck.isPending}
              disabled={isBusy}
              onClick={() => updateAndRecheck.mutate({ id: row.id, edit: form.changes })}
            >
              {form.isDirty ? 'Save and recheck' : 'Recheck'}
            </Button>
          </Group>
        </Group>
      </Stack>
    </SimpleGrid>
  );
};

// Opens the chart a step count reason is about, to fix its step range
const ChartLink = ({ chartInstanceId }: { chartInstanceId: number }) => {
  const chart = useQuery(api.admin.tracks.byChartInstance.queryOptions({ chartInstanceId }));
  return (
    <Button
      size="xs"
      variant="light"
      component={Link}
      to={
        chart.data ? routes.admin.tracks.getPath({ id: chart.data.trackId, chartInstanceId }) : '#'
      }
      disabled={!chart.data}
    >
      Open chart #{chartInstanceId}
    </Button>
  );
};
