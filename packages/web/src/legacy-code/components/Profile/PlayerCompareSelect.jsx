import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { useSelector } from 'react-redux';
import _ from 'lodash/fp';

import { useLanguage } from 'legacy-code/utils/context/translation';

import { routes } from 'legacy-code/constants/routes';

export const PlayerCompareSelect = () => {
  const lang = useLanguage();
  const navigate = useNavigate();
  const params = useParams();

  const players = useSelector((state) => state.results.players);

  const id = params.id;

  const otherPlayers = useMemo(() => {
    return _.flow(
      _.toPairs,
      _.map(([, { nickname, arcade_name, id }]) => ({
        label: `${nickname} (${arcade_name})`,
        value: nickname,
        id: _.toNumber(id),
      })),
      _.remove((it) => it.id === id),
      _.sortBy((it) => _.toLower(it.label))
    )(players);
  }, [id, players]);

  return (
    <Select
      closeMenuOnSelect
      className="select players"
      classNamePrefix="select"
      placeholder={lang.PLAYERS_PLACEHOLDER}
      options={otherPlayers}
      onChange={(value) => {
        navigate(routes.profile.compare.getPath({ id, compareToId: value.id }));
      }}
    />
  );
};
