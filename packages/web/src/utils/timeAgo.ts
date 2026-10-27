import TimeAgo, { type FixedFormatStyle } from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import pl from 'javascript-time-ago/locale/pl';
import ru from 'javascript-time-ago/locale/ru';
import convenient from 'javascript-time-ago/modules/gradation/convenient';
import ua from 'locale/uk';
import { Temporal } from 'temporal-polyfill';

import { language, translation } from 'utils/context/translation';
import { formatTimeAgo } from 'utils/daysAgo';

TimeAgo.addLocale(
  {
    ua: ua,
    en: en,
    ru: ru,
    pl: pl,
  }[language]
);
const timeAgo = new TimeAgo(
  {
    ua: 'uk-UA',
    ru: 'ru-RU',
    en: 'en-US',
    pl: 'pl-PL',
  }[language]
);

const getTimeAgo = (
  jsDate: Date,
  style: FixedFormatStyle,
  labels: { today: string; yesterday: string; yesterdayNight: string }
) => formatTimeAgo(timeAgo, style, labels, jsDate, Temporal.Now.timeZoneId());

const tinyLabel = (days: number) => {
  const { localeData } = timeAgo.getLocaleData('tiny');
  return timeAgo.formatValue(-days, 'day', localeData);
};

// For the leaderboard's date column: "0d", "1d" instead of "today", "yesterday", which are too
// wide
export const getShortTimeAgo = (jsDate: Date) => {
  return getTimeAgo(
    jsDate,
    {
      flavour: 'tiny',
      gradation: convenient,
      units: ['day', 'week', 'month'],
    },
    { today: tinyLabel(0), yesterday: tinyLabel(1), yesterdayNight: tinyLabel(1) }
  );
};
export const getLongTimeAgo = (lang: typeof translation, jsDate: Date) => {
  return getTimeAgo(
    jsDate,
    {
      flavour: 'long',
      gradation: convenient,
      units: ['day', 'week', 'month'],
    },
    { today: lang.TODAY, yesterday: lang.YESTERDAY, yesterdayNight: lang.YESTERDAY_NIGHT }
  );
};
