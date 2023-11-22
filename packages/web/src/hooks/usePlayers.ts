import { useMemo } from 'react';
import _ from 'lodash/fp';

import { api } from 'utils/trpc';

import { useMixes } from './useMixes';
import { useUser } from './useUser';

export const usePlayers = () => {
  const mixes = useMixes();
  return api.players.list.useQuery({ mixes: mixes.map((mix) => mix.id) });
};

export const usePlayersOptions = () => {
  const players = usePlayers();
  const user = useUser();

  return useMemo(() => {
    return {
      isLoading: user.isLoading || players.isLoading,
      options:
        !user.data || !players.data
          ? []
          : _.flow(
              _.map(({ nickname, arcade_name, id }: (typeof players.data)[number]) => ({
                label: `${nickname} (${arcade_name})`,
                value: nickname,
                isCurrentPlayer: user.data?.id === id,
              })),
              _.sortBy((it) => (it.isCurrentPlayer ? '!' : _.toLower(it.label)))
            )(players.data),
    };
  }, [players, user]);
};
