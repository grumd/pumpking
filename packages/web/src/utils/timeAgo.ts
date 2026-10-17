import TimeAgo, { type FixedFormatStyle } from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import pl from 'javascript-time-ago/locale/pl';
import ru from 'javascript-time-ago/locale/ru';
import convenient from 'javascript-time-ago/modules/gradation/convenient';
import ua from 'locale/uk';
import { Temporal, toTemporalInstant } from 'temporal-polyfill';

import { language, translation } from 'utils/context/translation';

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
  timeStyle: FixedFormatStyle,
  labels: { today: string; yesterday: string; yesterdayNight: string }
) => {
  const date = toTemporalInstant.bind(jsDate)().toZonedDateTimeISO(Temporal.Now.timeZoneId());
  const now = Temporal.Now.zonedDateTimeISO(Temporal.Now.timeZoneId());

  const dayDiff = date.startOfDay().until(now.startOfDay(), { largestUnit: 'day' }).days;

  return dayDiff === 0
    ? date.hour < 5
      ? labels.yesterdayNight
      : labels.today
    : dayDiff === 1
    ? labels.yesterday
    : timeAgo.format(jsDate, timeStyle);
};

export const getShortTimeAgo = (lang: typeof translation, jsDate: Date) => {
  const timeStyle: FixedFormatStyle = {
    flavour: 'tiny',
    gradation: convenient,
    units: ['day', 'week', 'month'],
  };
  // "1d" instead of "yesterday", which is too wide for the leaderboard's date column
  const oneDayAgo = timeAgo.format(Date.now() - 24 * 60 * 60 * 1000, timeStyle);
  return getTimeAgo(jsDate, timeStyle, {
    today: lang.TODAY,
    yesterday: oneDayAgo,
    yesterdayNight: oneDayAgo,
  });
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
