import { Text } from '@mantine/core';

import { useLanguage } from 'utils/context/translation';
import { getLongTimeAgo } from 'utils/timeAgo';

import css from './fading-date.module.css';

export const FadingDate = ({ date }: { date: Date }): JSX.Element => {
  const lang = useLanguage();
  const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  const dateOpacity = Math.min(1, Math.max(0.55, 1 - (daysAgo - 30) / 360));

  return (
    <Text
      span
      inherit
      c={daysAgo < 30 ? 'green' : undefined}
      className={css.fadingDate}
      style={{ '--date-opacity': dateOpacity }}
    >
      {getLongTimeAgo(lang, date)}
    </Text>
  );
};
