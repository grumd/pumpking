import { Button, Group, MultiSelect, Select, Stack, Text, TextInput } from '@mantine/core';
import { useAtom } from 'jotai';
import { useMemo } from 'react';
import { FaSearch } from 'react-icons/fa';

import CollapsibleBar from 'components/CollapsibleBar/CollapsibleBar';

import { usePlayers } from 'hooks/usePlayers';
import { useUser } from 'hooks/useUser';

import Loader from 'legacy-code/components/Shared/Loader';

import { useLanguage } from 'utils/context/translation';

import { useChartsQuery } from '../hooks/useChartsQuery';
import { filterAtom } from '../hooks/useFilter';

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
  console.log({ players });
  const user = useUser();
  console.log({ user });

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
  }, [players, user]);
};

const formFieldToNumberArray = (value: unknown) => {
  return !value ? [] : typeof value === 'string' ? value.split(',').map(Number) : undefined;
};

export const SearchForm = (): JSX.Element => {
  const lang = useLanguage();
  const { options: players, isLoading: isLoadingPlayers } = usePlayersOptions();

  const [searchFilter, setSearchFilter] = useAtom(filterAtom);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const formDataObject = Object.fromEntries(formData.entries());
    setSearchFilter({
      ...searchFilter,
      ...formDataObject,
      mixes: formFieldToNumberArray(formDataObject.mixes),
      playersAll: formFieldToNumberArray(formDataObject.playersAll),
      playersSome: formFieldToNumberArray(formDataObject.playersSome),
      playersNone: formFieldToNumberArray(formDataObject.playersNone),
      sortChartsByPlayers: formFieldToNumberArray(formDataObject.sortChartsByPlayers),
      sortChartsBy:
        typeof formDataObject.sorting === 'string'
          ? (formDataObject.sorting?.split(',')[0] as 'pp' | 'date' | 'difficulty' | undefined)
          : undefined,
      sortChartsDir:
        typeof formDataObject.sorting === 'string'
          ? (formDataObject.sorting?.split(',')[1] as 'asc' | 'desc' | undefined)
          : undefined,
    });
  };

  const sortingOptions = useMemo(() => {
    return [
      {
        label: 'by date (new to old)',
        value: 'date,desc',
      },
      {
        label: 'by date (old to new)',
        value: 'date,asc',
      },
      {
        label: 'by difficulty (easy to hard)',
        value: 'difficulty,asc',
      },
      {
        label: 'by difficulty (hard to easy)',
        value: 'difficulty,desc',
      },
      {
        label: 'by pp (big to small)',
        value: 'pp,desc',
      },
      {
        label: 'by pp (small to big)',
        value: 'pp,asc',
      },
    ];
  }, [lang]);

  return (
    <form onSubmit={onSubmit}>
      <Stack gap="sm">
        <Group gap="md" grow>
          <TextInput
            label="song name"
            name="songName"
            placeholder={lang.SONG_NAME_PLACEHOLDER}
            defaultValue={searchFilter.songName}
          />
          <MultiSelect
            label="mixes"
            name="mixes"
            checkIconPosition="left"
            data={mixOptions}
            defaultValue={searchFilter.mixes?.map(String)}
          />
          <Select
            label="scoring"
            name="scoring"
            data={scoringOptions}
            defaultValue={searchFilter.scoring}
          />
        </Group>
        <CollapsibleBar title="filters">
          <Text>{lang.SHOW_CHARTS_PLAYED_BY}</Text>
          <Group gap="md" grow>
            <MultiSelect
              label={lang.EACH_OF_THESE}
              name="playersAll"
              placeholder={lang.PLAYERS_PLACEHOLDER}
              checkIconPosition="left"
              data={players}
              defaultValue={searchFilter.playersAll?.map(String)}
              rightSection={isLoadingPlayers ? <Loader /> : null}
              nothingFoundMessage="Nothing found..."
              searchable
            />
            <MultiSelect
              label={lang.AND_ANY_OF_THESE}
              name="playersSome"
              placeholder={lang.PLAYERS_PLACEHOLDER}
              checkIconPosition="left"
              data={players}
              defaultValue={searchFilter.playersSome?.map(String)}
              rightSection={isLoadingPlayers ? <Loader /> : null}
              nothingFoundMessage="Nothing found..."
              searchable
            />
            <MultiSelect
              label={lang.AND_NONE_OF_THESE}
              name="playersNone"
              placeholder={lang.PLAYERS_PLACEHOLDER}
              checkIconPosition="left"
              data={players}
              defaultValue={searchFilter.playersNone?.map(String)}
              rightSection={isLoadingPlayers ? <Loader /> : null}
              nothingFoundMessage="Nothing found..."
              searchable
            />
          </Group>
        </CollapsibleBar>
        <CollapsibleBar title="sorting">
          <Group gap="md" grow>
            <Select
              name="sorting"
              label={lang.SORTING_LABEL}
              placeholder={lang.SORTING_PLACEHOLDER}
              clearable={false}
              data={sortingOptions}
              defaultValue={`${searchFilter.sortChartsBy ?? 'date'},${
                searchFilter.sortChartsDir ?? 'desc'
              }`}
            />
            <MultiSelect
              name="sortChartsByPlayers"
              label={lang.PLAYER_LABEL}
              placeholder={lang.PLAYERS_PLACEHOLDER}
              checkIconPosition="left"
              data={players}
              defaultValue={searchFilter.sortChartsByPlayers?.map(String)}
              rightSection={isLoadingPlayers ? <Loader /> : null}
              nothingFoundMessage="Nothing found..."
              searchable
            />
          </Group>
        </CollapsibleBar>
        <Group gap="md" grow>
          <Button leftSection={<FaSearch />} type="submit">
            {lang.SEARCH}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
