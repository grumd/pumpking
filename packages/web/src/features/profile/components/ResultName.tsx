import { Anchor, Text } from '@mantine/core';
import { NavLink } from 'react-router-dom';

import { routes } from 'constants/routes';

import { useLanguage } from 'utils/context/translation';
import { getLongTimeAgo } from 'utils/timeAgo';

import css from './result-row.module.css';

// The track name and how long ago the result was played: a column each on wide screens,
// the time under the name on phones
export const ResultName = ({
  sharedChartId,
  name,
  date,
  dateColor = 'grey',
}: {
  sharedChartId: number;
  name: string;
  date: Date;
  dateColor?: string;
}): JSX.Element => {
  const lang = useLanguage();
  return (
    <div className={css.nameCell}>
      <Anchor
        className={css.name}
        component={NavLink}
        to={routes.leaderboard.sharedChart.getPath({ sharedChartId })}
      >
        {name}
      </Anchor>
      <Text lh="1" c={dateColor} fz="xs">
        {getLongTimeAgo(lang, date)}
      </Text>
    </div>
  );
};
