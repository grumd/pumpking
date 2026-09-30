import type { ApiOutputs } from '@/api/trpc/router';
import { Anchor, Button, Group, SimpleGrid, Stack, Switch, Text, Textarea } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import Loader from 'components/Loader/Loader';

import { routes } from 'constants/routes';

import { api } from 'utils/trpc';

import { useAdminAction } from '../activity/activity';
import { ConfirmButton } from '../components/ConfirmButton';
import { MediaViewer } from '../components/MediaViewer';
import { PlayerSelect } from '../components/PlayerSelect';
import { NumberField, SelectField, TextField } from '../components/fields';
import { Info, Section } from '../components/layout';
import { useEditForm } from '../hooks/useEditForm';
import {
  PASS_OPTIONS,
  PLATE_OPTIONS,
  formatDate,
  formatNumber,
  gradeOptions,
  hasPlates,
} from '../scoring';

type Result = ApiOutputs['admin']['results']['get'];

interface ResultDetailProps {
  id: number;
  onDeleted: () => void;
}

export const ResultDetail = ({ id, onDeleted }: ResultDetailProps): JSX.Element => {
  const result = useQuery(api.admin.results.get.queryOptions({ id }, { retry: false }));
  if (result.isLoading) {
    return <Loader />;
  }
  if (!result.data) {
    return <Text c="dimmed">{result.error?.message ?? 'Not found'}</Text>;
  }
  return <ResultForm result={result.data} onDeleted={onDeleted} />;
};

const ResultForm = ({ result, onDeleted }: { result: Result; onDeleted: () => void }) => {
  const form = useEditForm({
    score: result.score,
    scoreIncrease: result.score_increase,
    grade: result.grade,
    plate: result.plate,
    isPass: result.is_pass == null ? null : result.is_pass === 1,
    perfects: result.perfects,
    greats: result.greats,
    goods: result.goods,
    bads: result.bads,
    misses: result.misses,
    maxCombo: result.max_combo,
    calories: result.calories,
    modsList: result.mods_list,
    actualPlayerId: result.actual_player_id,
    isHidden: result.is_hidden === 1,
    notes: result.notes,
  });

  const update = useAdminAction(
    api.admin.results.update.mutationOptions(),
    () => `Edit result #${result.id}`
  );
  const remove = useAdminAction(
    api.admin.results.delete.mutationOptions({ onSuccess: onDeleted }),
    () => `Delete result #${result.id}`
  );
  const isBusy = update.isPending || remove.isPending;

  const field = <K extends keyof typeof form.values>(key: K) => ({
    value: form.values[key],
    onChange: (value: (typeof form.values)[K]) => form.set(key, value),
  });

  return (
    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
      <Stack gap="sm">
        <MediaViewer source="results" id={result.id} />
        <SimpleGrid cols={2} spacing="xxs">
          <Info
            label="Chart"
            value={
              <Anchor
                component={Link}
                to={routes.leaderboard.sharedChart.getPath({ sharedChartId: result.shared_chart })}
              >
                {result.track_full_name} {result.chart_label}
              </Anchor>
            }
          />
          <Info label="Mix" value={result.mix_name} />
          <Info
            label="Played"
            value={formatDate(result.gained) + (result.exact_gain_date ? '' : ' (not exact)')}
          />
          <Info label="Added" value={formatDate(result.added)} />
          <Info
            label="Recognized as"
            value={`${result.player_name}: ${result.recognized_nickname ?? '?'} (#${
              result.recognized_player_id
            })`}
          />
          <Info
            label="Agent"
            value={result.agent < 0 ? 'added on the web' : result.agent_name ?? `#${result.agent}`}
          />
          <Info label="Phoenix score" value={formatNumber(result.score_phoenix)} />
          <Info label="pp / exp" value={`${result.pp?.toFixed(2) ?? '—'} / ${result.exp ?? '—'}`} />
          <Info label="Rank mode" value={result.rank_mode ? 'yes' : 'no'} />
          <Info
            label="Chart steps"
            value={`${result.min_total_steps ?? '?'}–${result.max_total_steps ?? '?'}`}
          />
        </SimpleGrid>
      </Stack>

      <Stack gap="md">
        <Section title="Score">
          <SimpleGrid cols={3} spacing="sm">
            <NumberField label="Score" {...field('score')} />
            <NumberField label="Score increase" {...field('scoreIncrease')} />
            <SelectField label="Grade" {...field('grade')} options={gradeOptions(result.mix)} />
            {hasPlates(result.mix) && (
              <SelectField label="Plate" {...field('plate')} options={PLATE_OPTIONS} />
            )}
            <SelectField
              label="Pass"
              value={form.values.isPass == null ? null : form.values.isPass ? '1' : '0'}
              onChange={(v) => form.set('isPass', v == null ? null : v === '1')}
              options={PASS_OPTIONS}
              description={result.mix <= 26 ? 'Follows the grade on XX' : undefined}
            />
          </SimpleGrid>
        </Section>

        <Section title="Steps">
          <SimpleGrid cols={4} spacing="sm">
            <NumberField label="Perfect" {...field('perfects')} />
            <NumberField label="Great" {...field('greats')} />
            <NumberField label="Good" {...field('goods')} />
            <NumberField label="Bad" {...field('bads')} />
            <NumberField label="Miss" {...field('misses')} />
            <NumberField label="Max combo" {...field('maxCombo')} />
            <NumberField label="Calories" {...field('calories')} />
          </SimpleGrid>
        </Section>

        <Section title="Other">
          <TextField
            label="Mods"
            {...field('modsList')}
            placeholder="e.g. 2x VJ"
            description="Checked when saved; VJ sets rank mode"
          />
          <PlayerSelect
            label="Actual player"
            value={form.values.actualPlayerId}
            onChange={(playerId) => form.set('actualPlayerId', playerId)}
            placeholder={`The recognized player, ${
              result.recognized_nickname ?? `#${result.recognized_player_id}`
            }`}
            description="Moves the result to another player"
          />
          <Switch
            label="Hidden"
            checked={form.values.isHidden}
            onChange={(event) => form.set('isHidden', event.currentTarget.checked)}
          />
          <Textarea
            label="Notes"
            value={form.values.notes ?? ''}
            onChange={(event) => form.set('notes', event.currentTarget.value || null)}
            autosize
            minRows={2}
          />
        </Section>

        <Text size="xs" c="dimmed">
          After saving, pp and exp are recalculated within a few seconds.
        </Text>

        <Group justify="space-between">
          <ConfirmButton
            question={`Delete result #${result.id}? Its player's pp and exp are recalculated.`}
            confirmLabel="Delete"
            onConfirm={() => remove.mutate({ id: result.id })}
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
              loading={update.isPending}
              disabled={!form.isDirty || isBusy}
              onClick={() => update.mutate({ id: result.id, edit: form.changes })}
            >
              Save
            </Button>
          </Group>
        </Group>
      </Stack>
    </SimpleGrid>
  );
};
