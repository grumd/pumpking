import { Button, Group, NumberInput, Select, Stack, Switch, TextInput } from '@mantine/core';
import type { ComboboxItem } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';

import { Card } from 'components/Card/Card';
import { Flag } from 'components/Flag/Flag';
import Loader from 'components/Loader/Loader';

import { useUser } from 'hooks/useUser';

import { useLanguage } from 'utils/context/translation';
import { api } from 'utils/trpc';

import { useUpdatePlayer } from './useUpdatePlayer';

const COUNTRY_OPTIONS = [
  { value: 'BR', label: 'Brazil' },
  { value: 'FR', label: 'France' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'MX', label: 'Mexico' },
  { value: 'PL', label: 'Poland' },
  { value: 'RU', label: 'Russia' },
  { value: 'UA', label: 'Ukraine' },
  { value: 'US', label: 'United States' },
];

const renderCountryOption = ({ option }: { option: ComboboxItem }) => (
  <Group gap="xs">
    <Flag region={option.value} />
    <span>{option.label}</span>
  </Group>
);

interface FormState {
  canAddResultsManually: boolean;
  hidden: boolean;
  region: string | null;
  telegramTag: string;
  telegramId: string;
}

export const AdminPanel = (): JSX.Element | null => {
  const params = useParams();
  const lang = useLanguage();
  const user = useUser();
  const playerId = params.id ? Number(params.id) : undefined;

  const isAdmin = !!user.data?.is_admin;

  const playerAdminInfo = useQuery({
    ...api.admin.getPlayerAdminInfo.queryOptions(playerId ? { playerId } : (undefined as never)),
    enabled: isAdmin && !!playerId,
  });

  const updateMutation = useUpdatePlayer();

  const [formState, setFormState] = useState<FormState>({
    canAddResultsManually: false,
    hidden: false,
    region: null,
    telegramTag: '',
    telegramId: '',
  });

  // Sync form state with fetched data
  useEffect(() => {
    if (playerAdminInfo.data) {
      setFormState({
        canAddResultsManually: playerAdminInfo.data.canAddResultsManually,
        hidden: playerAdminInfo.data.hidden,
        region: playerAdminInfo.data.region,
        telegramTag: playerAdminInfo.data.telegramTag ?? '',
        telegramId: playerAdminInfo.data.telegramId?.toString() ?? '',
      });
    }
  }, [playerAdminInfo.data]);

  const handleSave = () => {
    if (!playerId) return;

    updateMutation.mutate({
      playerId,
      canAddResultsManually: formState.canAddResultsManually,
      hidden: formState.hidden,
      region: formState.region,
      telegramTag: formState.telegramTag || null,
      telegramId: formState.telegramId ? parseInt(formState.telegramId, 10) : null,
    });
  };

  const hasChanges =
    playerAdminInfo.data &&
    (formState.canAddResultsManually !== playerAdminInfo.data.canAddResultsManually ||
      formState.hidden !== playerAdminInfo.data.hidden ||
      formState.region !== playerAdminInfo.data.region ||
      formState.telegramTag !== (playerAdminInfo.data.telegramTag ?? '') ||
      formState.telegramId !== (playerAdminInfo.data.telegramId?.toString() ?? ''));

  if (!isAdmin || !playerId) {
    return null;
  }

  const isDisabled = updateMutation.isPending || playerAdminInfo.isLoading;

  return (
    <Card title={lang.ADMIN_PANEL} mb="xs">
      {playerAdminInfo.isLoading && <Loader />}
      {playerAdminInfo.data && (
        <Stack gap="sm">
          <Switch
            label={lang.CAN_ADD_RESULTS_MANUALLY}
            checked={formState.canAddResultsManually}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                canAddResultsManually: event.currentTarget.checked,
              }))
            }
            disabled={isDisabled}
          />

          <Switch
            label={lang.HIDDEN_PLAYER}
            checked={formState.hidden}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, hidden: event.currentTarget.checked }))
            }
            disabled={isDisabled}
          />

          <Select
            label={lang.REGION}
            placeholder="Select region"
            data={COUNTRY_OPTIONS}
            value={formState.region}
            onChange={(value) => setFormState((prev) => ({ ...prev, region: value }))}
            clearable
            renderOption={renderCountryOption}
            disabled={isDisabled}
          />

          <TextInput
            label={lang.TELEGRAM_TAG}
            value={formState.telegramTag}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, telegramTag: event.currentTarget.value }))
            }
            disabled={isDisabled}
          />

          <NumberInput
            label={lang.TELEGRAM_ID}
            value={formState.telegramId}
            onChange={(value) =>
              setFormState((prev) => ({ ...prev, telegramId: value.toString() }))
            }
            disabled={isDisabled}
            allowNegative={false}
            allowDecimal={false}
          />

          <Button
            onClick={handleSave}
            loading={updateMutation.isPending}
            disabled={!hasChanges || isDisabled}
          >
            {lang.SAVE}
          </Button>
        </Stack>
      )}
    </Card>
  );
};
