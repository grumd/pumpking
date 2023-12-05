import { Button, Flex, Group, Stack, Text } from '@mantine/core';
import { useAtom } from 'jotai';
import { useMemo } from 'react';
import { Form, useForm } from 'react-hook-form';
import { MultiSelect, Select, TextInput } from 'react-hook-form-mantine';
import { FaSearch, FaUndo } from 'react-icons/fa';

import CollapsibleBar from 'components/CollapsibleBar/CollapsibleBar';

import { usePlayers } from 'hooks/usePlayers';
import { useUser } from 'hooks/useUser';

import Loader from 'legacy-code/components/Shared/Loader';

import { useLanguage } from 'utils/context/translation';

import { type ChartsFilter, useChartsQuery } from '../../hooks/useChartsQuery';
import { filterAtom, initialFilter } from '../../hooks/useFilter';
import ChartFilter from './ChartFilter';
import type { SearchFormValues } from './formTypes';

const mixOptions = [
  {
    label: 'Prime',
    value: '24',
  },
  {
    label: 'Prime 2',
    value: '25',
  },
  {
    label: 'XX',
    value: '26',
  },
  {
    label: 'Phoenix',
    value: '27',
  },
];

const scoringOptions = [
  {
    label: 'Phoenix',
    value: 'phoenix',
  },
  {
    label: 'XX',
    value: 'xx',
  },
];

const usePlayersOptions = () => {
  const players = usePlayers();
  const user = useUser();

  return useMemo(() => {
    return {
      isLoading: user.isLoading || players.isLoading,
      options:
        players.data
          ?.map(({ nickname, arcade_name, id }) => ({
            label: `${nickname} (${arcade_name})`,
            value: `${id}`,
            isCurrentPlayer: user?.data?.id === id,
          }))
          .sort((a, b) => {
            if (a.isCurrentPlayer) return -1;
            if (b.isCurrentPlayer) return 1;
            return a.label.localeCompare(b.label);
          }) ?? [],
    };
  }, [players.isLoading, user.isLoading, players.data, user.data?.id]);
};

const formToFilter = ({
  sortingType,
  mixes,
  playersSome,
  playersNone,
  playersAll,
  sortChartsByPlayers,
  levels,
  ...rest
}: SearchFormValues): ChartsFilter => ({
  ...rest,
  sortChartsBy: sortingType?.split(',')[0] as 'pp' | 'date' | 'difficulty' | undefined,
  sortChartsDir: sortingType?.split(',')[1] as 'asc' | 'desc' | undefined,
  mixes: mixes?.map(Number),
  playersAll: playersAll?.map(Number),
  playersSome: playersSome?.map(Number),
  playersNone: playersNone?.map(Number),
  sortChartsByPlayers: sortChartsByPlayers?.map(Number),
  minLevel: levels?.[0],
  maxLevel: levels?.[1],
});

const filterToForm = (filter: ChartsFilter): SearchFormValues => ({
  ...filter,
  sortingType:
    filter.sortChartsBy && filter.sortChartsDir
      ? `${filter.sortChartsBy},${filter.sortChartsDir}`
      : 'date,desc',
  mixes: filter.mixes?.map(String) ?? ['26', '27'],
  playersAll: filter.playersAll?.map(String) ?? [],
  playersSome: filter.playersSome?.map(String) ?? [],
  playersNone: filter.playersNone?.map(String) ?? [],
  sortChartsByPlayers: filter.sortChartsByPlayers?.map(String) ?? [],
  levels: [filter.minLevel ?? 1, filter.maxLevel ?? 28],
  scoring: filter.scoring ?? 'phoenix',
});

export const SearchForm = (): JSX.Element => {
  const lang = useLanguage();
  const chartsQuery = useChartsQuery();
  const { options: players, isLoading: isLoadingPlayers } = usePlayersOptions();

  const [searchFilter, setSearchFilter] = useAtom(filterAtom);

  const { control, reset } = useForm<SearchFormValues>({
    defaultValues: () => Promise.resolve(filterToForm(searchFilter)),
  });

  const onSubmit = (values: ChartsFilter) => {
    setSearchFilter({
      ...searchFilter,
      ...values,
    });
  };

  const onReset = () => {
    const newFilter = structuredClone(initialFilter);
    setSearchFilter(newFilter);
    reset(filterToForm(newFilter));
  };

  const sortingOptions = useMemo(() => {
    return [
      {
        label: lang.BY_DATE_DESC,
        value: 'date,desc' as const,
      },
      {
        label: lang.BY_DATE_ASC,
        value: 'date,asc' as const,
      },
      {
        label: lang.BY_DIFFICULTY_ASC,
        value: 'difficulty,asc' as const,
      },
      {
        label: lang.BY_DIFFICULTY_DESC,
        value: 'difficulty,desc' as const,
      },
      {
        label: lang.BY_PP_DESC,
        value: 'pp,desc' as const,
      },
      {
        label: lang.BY_PP_ASC,
        value: 'pp,asc' as const,
      },
    ];
  }, [lang]);

  return (
    <Form control={control} onSubmit={(e) => onSubmit(formToFilter(e.data))}>
      <Stack gap="sm">
        <Group gap="md" grow>
          <TextInput
            name="songName"
            label={lang.SONG_NAME_LABEL}
            placeholder={lang.SONG_NAME_PLACEHOLDER}
            defaultValue={searchFilter.songName}
            control={control}
          />
          <MultiSelect
            label={lang.MIXES_LABEL}
            checkIconPosition="left"
            data={mixOptions}
            control={control}
            name="mixes"
          />
          <Select
            label={lang.SCORING_LABEL}
            data={scoringOptions}
            control={control}
            name="scoring"
          />
        </Group>
        <CollapsibleBar title={lang.FILTERS}>
          <Text>{lang.SHOW_CHARTS_PLAYED_BY}</Text>
          <Group gap="md" grow>
            <MultiSelect
              label={lang.EACH_OF_THESE}
              placeholder={lang.PLAYERS_PLACEHOLDER}
              checkIconPosition="left"
              data={players}
              rightSection={isLoadingPlayers ? <Loader /> : null}
              nothingFoundMessage={lang.NOTHING_FOUND}
              searchable
              control={control}
              name="playersAll"
            />
            <MultiSelect
              label={lang.AND_ANY_OF_THESE}
              placeholder={lang.PLAYERS_PLACEHOLDER}
              checkIconPosition="left"
              data={players}
              rightSection={isLoadingPlayers ? <Loader /> : null}
              nothingFoundMessage={lang.NOTHING_FOUND}
              searchable
              control={control}
              name="playersSome"
            />
            <MultiSelect
              label={lang.AND_NONE_OF_THESE}
              placeholder={lang.PLAYERS_PLACEHOLDER}
              checkIconPosition="left"
              data={players}
              rightSection={isLoadingPlayers ? <Loader /> : null}
              nothingFoundMessage={lang.NOTHING_FOUND}
              searchable
              control={control}
              name="playersNone"
            />
          </Group>
        </CollapsibleBar>
        <Flex gap="md">
          <div style={{ flex: '1 1 auto' }}>
            <CollapsibleBar title={lang.SORTING}>
              <Group gap="md" grow>
                <Select
                  label={lang.SORTING_LABEL}
                  placeholder={lang.SORTING_PLACEHOLDER}
                  clearable={false}
                  data={sortingOptions}
                  control={control}
                  name="sortingType"
                />
                <MultiSelect
                  label={lang.PLAYER_LABEL}
                  placeholder={lang.PLAYERS_PLACEHOLDER}
                  checkIconPosition="left"
                  data={players}
                  rightSection={isLoadingPlayers ? <Loader /> : null}
                  nothingFoundMessage={lang.NOTHING_FOUND}
                  searchable
                  control={control}
                  name="sortChartsByPlayers"
                />
              </Group>
            </CollapsibleBar>
          </div>
          <ChartFilter control={control} />
        </Flex>
        <Flex gap="md">
          <Button
            style={{ flex: '1 1 auto' }}
            disabled={chartsQuery.isLoading}
            leftSection={<FaSearch />}
            type="submit"
          >
            {lang.SEARCH}
          </Button>
          <Button disabled={chartsQuery.isLoading} leftSection={<FaUndo />} onClick={onReset}>
            {lang.RESET_FILTERS}
          </Button>
        </Flex>
      </Stack>
    </Form>
  );
};
