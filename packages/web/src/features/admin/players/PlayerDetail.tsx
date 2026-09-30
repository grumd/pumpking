import type { ApiInputs, ApiOutputs } from '@/api/trpc/router';
import { Anchor, Button, Group, SimpleGrid, Stack, Switch, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import Loader from 'components/Loader/Loader';

import { routes } from 'constants/routes';

import { api } from 'utils/trpc';

import { useAdminAction } from '../activity/activity';
import { ArcadeNamesEditor } from '../components/ArcadeNamesEditor';
import { PlayerSelect } from '../components/PlayerSelect';
import { NumberField, SelectField, TextField } from '../components/fields';
import { Info, Section } from '../components/layout';
import { useEditForm } from '../hooks/useEditForm';
import { formatDate } from '../scoring';

type Player = ApiOutputs['admin']['players']['get'];
type PlayerFields = ApiInputs['admin']['players']['save']['fields'];

const REGIONS = [
  { value: 'BR', label: 'Brazil' },
  { value: 'FR', label: 'France' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'MX', label: 'Mexico' },
  { value: 'PL', label: 'Poland' },
  { value: 'RU', label: 'Russia' },
  { value: 'UA', label: 'Ukraine' },
  { value: 'US', label: 'United States' },
];

const toFields = (player: Player): PlayerFields => ({
  nickname: player.nickname,
  email: player.email,
  region: player.region,
  telegramTag: player.telegram_tag,
  telegramId: player.telegram_id,
  hidden: player.hidden,
  discardResults: player.discard_results,
  isAdmin: player.is_admin,
  canAddResultsManually: player.can_add_results_manually,
  actualPlayerId: player.actual_player_id,
  arcadeNames: player.arcadeNames,
});

const NEW_PLAYER: PlayerFields = {
  nickname: '',
  email: null,
  region: null,
  telegramTag: null,
  telegramId: null,
  hidden: false,
  discardResults: false,
  isAdmin: false,
  canAddResultsManually: false,
  actualPlayerId: null,
  arcadeNames: {},
};

interface PlayerDetailProps {
  id: number | 'new';
  onCreated: (id: number) => void;
}

export const PlayerDetail = ({ id, onCreated }: PlayerDetailProps): JSX.Element => {
  const player = useQuery({
    ...api.admin.players.get.queryOptions({ id: id === 'new' ? 0 : id }, { retry: false }),
    enabled: id !== 'new',
  });
  if (id === 'new') {
    return <PlayerForm player={null} initial={NEW_PLAYER} onCreated={onCreated} />;
  }
  if (player.isLoading) {
    return <Loader />;
  }
  if (!player.data) {
    return <Text c="dimmed">{player.error?.message ?? 'Not found'}</Text>;
  }
  return <PlayerForm player={player.data} initial={toFields(player.data)} onCreated={onCreated} />;
};

interface PlayerFormProps {
  player: Player | null;
  initial: PlayerFields;
  onCreated: (id: number) => void;
}

const PlayerForm = ({ player, initial, onCreated }: PlayerFormProps) => {
  const form = useEditForm(initial);
  const save = useAdminAction(
    api.admin.players.save.mutationOptions({
      onSuccess: (data) => !player && onCreated(data.id),
    }),
    () => (player ? `Edit player #${player.id}` : `Create player '${form.values.nickname}'`)
  );

  const switchProps = (key: 'hidden' | 'discardResults' | 'isAdmin' | 'canAddResultsManually') => ({
    checked: form.values[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      form.set(key, event.currentTarget.checked),
  });

  return (
    <Stack gap="md">
      {player && (
        <Group gap="lg">
          <Info label="Results" value={player.resultsCount.toLocaleString('en-US')} />
          <Info label="Last played" value={formatDate(player.lastResultGained)} />
          <Info label="Hidden since" value={formatDate(player.hidden_since)} />
          <Group gap="xs" ml="auto">
            <Anchor component={Link} to={routes.profile.getPath({ id: player.id })} size="sm">
              Profile
            </Anchor>
            <Anchor
              component={Link}
              to={`${routes.admin.results.path}?player=${player.id}`}
              size="sm"
            >
              Their results
            </Anchor>
          </Group>
        </Group>
      )}

      <Section title="Profile">
        <SimpleGrid cols={2} spacing="sm">
          <TextField
            label="Nickname"
            value={form.values.nickname}
            onChange={(v) => form.set('nickname', v ?? '')}
          />
          <TextField
            label="E-mail"
            value={form.values.email}
            onChange={(v) => form.set('email', v)}
          />
          <SelectField
            label="Region"
            value={form.values.region}
            onChange={(v) => form.set('region', v)}
            options={REGIONS}
          />
          <PlayerSelect
            label="Alias of"
            value={form.values.actualPlayerId}
            onChange={(v) => form.set('actualPlayerId', v)}
            excludeId={player?.id}
            placeholder="Not an alias"
            description="Results recognized as this player go to that one"
          />
          <TextField
            label="Telegram tag"
            value={form.values.telegramTag}
            onChange={(v) => form.set('telegramTag', v)}
            description="Links the Telegram bot's chat with this player"
          />
          <NumberField
            label="Telegram ID"
            isId
            value={form.values.telegramId}
            onChange={(v) => form.set('telegramId', v)}
          />
        </SimpleGrid>
      </Section>

      <Section title="Arcade names">
        <ArcadeNamesEditor
          value={form.values.arcadeNames}
          onChange={(v) => form.set('arcadeNames', v)}
          defaultEdist={1}
        />
      </Section>

      <Section title="Access">
        <Switch
          label="Hidden: not shown on leaderboards and in the ranking"
          {...switchProps('hidden')}
        />
        <Switch
          label="Discard results: ingestion drops their results"
          {...switchProps('discardResults')}
        />
        <Switch label="Can add results on the web" {...switchProps('canAddResultsManually')} />
        <Switch label="Admin: can open this admin page" {...switchProps('isAdmin')} />
      </Section>

      <Group justify="flex-end" gap="xs">
        {form.isDirty && player && (
          <Button variant="default" onClick={form.reset} disabled={save.isPending}>
            Undo changes
          </Button>
        )}
        <Button
          loading={save.isPending}
          disabled={!form.isDirty || !form.values.nickname.trim()}
          onClick={() => save.mutate({ id: player?.id ?? null, fields: form.values })}
        >
          {player ? 'Save' : 'Create player'}
        </Button>
      </Group>
    </Stack>
  );
};
