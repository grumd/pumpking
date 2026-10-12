import {
  ActionIcon,
  Button,
  CheckIcon,
  Group,
  Modal,
  MultiSelect,
  Stack,
  Switch,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import _ from 'lodash/fp';
import { useMemo } from 'react';
import { FaCog, FaSync } from 'react-icons/fa';

import { Card } from 'components/Card/Card';
import { ErrorAlert } from 'components/ErrorAlert/ErrorAlert';
import { Flag } from 'components/Flag/Flag';
import { PageContainer } from 'components/PageContainer/PageContainer';

import { usePreferencesMutation } from 'hooks/usePreferencesMutation';
import { useUser } from 'hooks/useUser';

import { useLanguage } from 'utils/context/translation';
import { api } from 'utils/trpc';

import RankingList from './components/RankingList';

const Ranking = () => {
  const lang = useLanguage();
  const userQuery = useUser();
  const [settingsOpened, { open: openSettings, close: closeSettings }] = useDisclosure(false);
  const {
    isLoading,
    isFetching,
    error,
    data: ranking,
    refetch: refetchRanking,
  } = useQuery(api.players.stats.queryOptions());

  const preferencesMutation = usePreferencesMutation();
  const preferences = userQuery.data?.preferences;

  const availableRegions = useMemo(() => {
    if (!ranking) return [];
    const regions = ranking
      .map((player) => player.region)
      .filter((region): region is string => region !== null);
    return [...new Set(regions)].sort();
  }, [ranking]);

  const hiddenRegions = useMemo(() => {
    if (!preferences?.hiddenRegions) return [];
    return Object.entries(preferences.hiddenRegions)
      .filter(([, isHidden]) => isHidden)
      .map(([region]) => region);
  }, [preferences?.hiddenRegions]);

  const onChangeHidingPlayers = () => {
    if (preferences) {
      preferencesMutation.mutate(
        _.set(['showHiddenPlayersInRanking'], !preferences.showHiddenPlayersInRanking, preferences)
      );
    }
  };

  const onChangeHiddenRegions = (selectedRegions: string[]) => {
    if (preferences) {
      const newHiddenRegions = availableRegions.reduce<Record<string, boolean>>((acc, region) => {
        acc[region] = selectedRegions.includes(region);
        return acc;
      }, {});
      preferencesMutation.mutate(_.set(['hiddenRegions'], newHiddenRegions, preferences));
    }
  };

  const onRefresh = () => {
    if (!isLoading) {
      refetchRanking();
    }
  };

  return (
    <PageContainer>
      {error && <ErrorAlert>{error.message}</ErrorAlert>}
      <Group justify="space-between">
        <Button disabled={isFetching} onClick={onRefresh} leftSection={<FaSync />}>
          {lang.UPDATE}
        </Button>
        <ActionIcon onClick={openSettings} disabled={!preferences} aria-label={lang.FILTERS}>
          <FaCog />
        </ActionIcon>
      </Group>
      <Card>
        <RankingList ranking={ranking} isLoading={isLoading} preferences={preferences} />
      </Card>

      <Modal opened={settingsOpened} onClose={closeSettings} title={lang.FILTERS}>
        <Stack>
          <Switch
            label={lang.SHOW_ALL}
            checked={preferences?.showHiddenPlayersInRanking ?? false}
            onChange={onChangeHidingPlayers}
            disabled={!preferences}
          />
          <MultiSelect
            label={lang.HIDE_COUNTRIES}
            placeholder={lang.HIDE_COUNTRIES}
            data={availableRegions}
            value={hiddenRegions}
            onChange={onChangeHiddenRegions}
            disabled={!preferences}
            clearable
            searchable
            renderOption={({ option, checked }) => (
              <Group gap="xs">
                {checked && <CheckIcon size={12} />}
                <Flag region={option.value} size="sm" />
                {option.value}
              </Group>
            )}
          />
        </Stack>
      </Modal>
    </PageContainer>
  );
};

export default Ranking;
