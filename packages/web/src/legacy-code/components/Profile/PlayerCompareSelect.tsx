import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Select from 'react-select';
import _ from 'lodash/fp';

import { useLanguage } from 'utils/context/translation';
import { routes } from 'legacy-code/constants/routes';

import { usePlayers } from 'hooks/usePlayers';

export const PlayerCompareSelect = () => {
  const lang = useLanguage();
  const navigate = useNavigate();
  const params = useParams();
  const players = usePlayers();

  const id = params.id;

  const otherPlayers = useMemo(() => {
    return players.data
      ? _.flow(
          _.map(({ pp, nickname, arcade_name, id }: (typeof players.data)[number]) => ({
            label: `${nickname} (${arcade_name})`,
            value: nickname,
            id: _.toNumber(id),
            pp,
          })),
          _.remove((it) => it.id === Number(id) || !it.pp),
          _.sortBy((it) => _.toLower(it.label))
        )(players.data)
      : [];
  }, [id, players]);

  return (
    <Select
      closeMenuOnSelect
      className="select players"
      classNamePrefix="select"
      placeholder={lang.PLAYERS_PLACEHOLDER}
      options={otherPlayers}
      isLoading={players.isLoading}
      onChange={(value) => {
        navigate(routes.profile.compare.getPath({ id, compareToId: value?.id }));
      }}
    />
  );
};
