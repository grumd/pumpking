import type { ApiOutputs } from '@/api/trpc/router';
import { ActionIcon, Button, Group, SimpleGrid, Stack, Text, UnstyledButton } from '@mantine/core';
import { MIX_NAME_BY_ID } from '@pumpking/utils/mixes';
import { useQuery } from '@tanstack/react-query';
import classNames from 'classnames';
import { Fragment, useEffect, useRef, useState } from 'react';
import { FiArrowRight, FiMoreHorizontal } from 'react-icons/fi';

import css from './track-detail.module.scss';

import { chartLabelColor } from 'components/ChartLabel/ChartLabel';
import chartLabelCss from 'components/ChartLabel/chart-label.module.css';
import Loader from 'components/Loader/Loader';

import { api } from 'utils/trpc';

import { useAdminAction } from '../activity/activity';
import { ArcadeNamesEditor } from '../components/ArcadeNamesEditor';
import { DetailDrawer } from '../components/DetailDrawer';
import { Info, Section } from '../components/layout';
import { useEditForm } from '../hooks/useEditForm';
import { ChartInstanceDetail } from './ChartInstanceDetail';

type Track = ApiOutputs['admin']['tracks']['get'];
type ChartInstance = Track['charts'][number]['instances'][number];

interface TrackDetailProps {
  id: number;
  // A chart instance to point out and open, e.g. the one a purgatory reason is about
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
  // The chart the link points to (e.g. from purgatory) opens in its window
  const [editingId, setEditingId] = useState<number | null>(highlightChartId ?? null);
  useEffect(() => {
    setEditingId(highlightChartId ?? null);
  }, [highlightChartId]);
  const editing = track.charts
    .flatMap((chart) => chart.instances)
    .find((instance) => instance.id === editingId);

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
            // Only the mixes the track has charts on
            mixes={track.charts.flatMap((chart) => chart.instances.map((instance) => instance.mix))}
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
        <div className={css.sharedList}>
          {track.charts.map((chart) => (
            <SharedChart
              key={chart.id}
              chart={chart}
              highlightChartId={highlightChartId}
              onEdit={setEditingId}
            />
          ))}
        </div>
      </Section>

      <DetailDrawer
        opened={!!editing}
        onClose={() => setEditingId(null)}
        title={
          editing &&
          `Chart #${editing.id}: ${editing.label}, ${
            MIX_NAME_BY_ID[editing.mix] ?? `mix #${editing.mix}`
          }`
        }
        wide
      >
        {editing && <ChartInstanceDetail key={editing.id} instance={editing} />}
      </DetailDrawer>
    </Stack>
  );
};

// A shared chart, ticket style: its instances mix by mix, with arrows between them. The
// instances of mixes with no name are folded into a "…" button that shows them
const SharedChart = ({
  chart,
  highlightChartId,
  onEdit,
}: {
  chart: Track['charts'][number];
  highlightChartId?: number;
  onEdit: (chartInstanceId: number) => void;
}) => {
  const [showAll, setShowAll] = useState(false);
  // An instance, or null for a run of folded ones
  const items: (ChartInstance | null)[] = [];
  for (const instance of chart.instances) {
    if (showAll || MIX_NAME_BY_ID[instance.mix] || instance.id === highlightChartId) {
      items.push(instance);
    } else if (items.at(-1) !== null) {
      items.push(null);
    }
  }

  return (
    <div className={css.shared}>
      <div className={css.sharedHeader}>
        <span className={css.sharedTitle}>shared</span>
        <span className={css.id}>#{chart.id}</span>
      </div>
      <div className={css.instances}>
        {items.map((instance, index) => (
          <Fragment key={instance?.id ?? `folded-${index}`}>
            {index > 0 && (
              <span className={css.arrow}>
                <FiArrowRight size={22} />
              </span>
            )}
            {instance ? (
              <ChartInstanceCard
                instance={instance}
                type={chart.type}
                // The card before it: after a "…" button the label is bright
                sameLabelAsPrevious={items[index - 1]?.label === instance.label}
                sameStepsAsPrevious={
                  !!items[index - 1] &&
                  items[index - 1]?.min_total_steps === instance.min_total_steps &&
                  items[index - 1]?.max_total_steps === instance.max_total_steps
                }
                highlighted={instance.id === highlightChartId}
                onClick={() => onEdit(instance.id)}
              />
            ) : (
              <ActionIcon
                variant="default"
                size="lg"
                onClick={() => setShowAll(true)}
                title="Show the charts of mixes with no name"
              >
                <FiMoreHorizontal />
              </ActionIcon>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
};

interface ChartInstanceCardProps {
  instance: ChartInstance;
  type: Track['charts'][number]['type'];
  // The label didn't change since the previous card: it's dimmed
  sameLabelAsPrevious: boolean;
  // Same for the step range: dimmed when it didn't change, bright when it did
  sameStepsAsPrevious: boolean;
  highlighted: boolean;
  onClick: () => void;
}

const ChartInstanceCard = ({
  instance,
  type,
  sameLabelAsPrevious,
  sameStepsAsPrevious,
  highlighted,
  onClick,
}: ChartInstanceCardProps) => {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (highlighted) {
      ref.current?.scrollIntoView({ block: 'center' });
    }
  }, [highlighted]);

  const hasSteps = instance.min_total_steps !== null || instance.max_total_steps !== null;

  return (
    <UnstyledButton
      ref={ref}
      onClick={onClick}
      className={classNames(css.instance, highlighted && css.highlighted)}
    >
      <div className={css.instanceId}>#{instance.id}</div>
      <div className={css.instanceBody}>
        <div className={css.instanceChart}>
          <span>{MIX_NAME_BY_ID[instance.mix] ?? `Mix #${instance.mix}`}</span>
          {/* Older mixes' labels (e.g. NL-5) don't tell the type, the shared chart does */}
          <span
            className={classNames(
              chartLabelCss.chartLabel,
              chartLabelColor(type),
              sameLabelAsPrevious && css.labelSame
            )}
          >
            {instance.label}
          </span>
        </div>
        <div className={css.instanceFooter}>
          <span title="Results">
            {instance.resultsCount > 0 ? `≡ ${instance.resultsCount.toLocaleString('en')}` : ''}
          </span>
          <span title="Steps" className={sameStepsAsPrevious ? undefined : css.stepsChanged}>
            {!hasSteps
              ? '\u00a0'
              : instance.min_total_steps === instance.max_total_steps
              ? `◆ ${instance.min_total_steps}`
              : `◆ ${instance.min_total_steps ?? '?'}–${instance.max_total_steps ?? '?'}`}
          </span>
        </div>
      </div>
    </UnstyledButton>
  );
};
