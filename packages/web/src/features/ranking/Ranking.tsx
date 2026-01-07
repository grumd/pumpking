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

import './ranking.scss';

import { Flag } from 'components/Flag/Flag';

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
    <div className="ranking-page">
      <div className="content">
        {error && error.message}
        <div className="top-controls">
          <Button size="sm" disabled={isFetching} onClick={onRefresh} leftSection={<FaSync />}>
            {lang.UPDATE}
          </Button>
          <ActionIcon
            variant="subtle"
            size="lg"
            onClick={openSettings}
            disabled={!preferences}
            ml="auto"
          >
            <FaCog />
          </ActionIcon>
        </div>
        <RankingList ranking={ranking} isLoading={isLoading} preferences={preferences} />
      </div>

      <Modal opened={settingsOpened} onClose={closeSettings} title={lang.FILTERS} centered>
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
    </div>
  );
};

export default Ranking;
