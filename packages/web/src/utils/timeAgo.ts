import TimeAgo, { type FixedFormatStyle } from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
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
  }[language]
);
const timeAgo = new TimeAgo(
  {
    ua: 'uk-UA',
    ru: 'ru-RU',
    en: 'en-US',
  }[language]
);

const getTimeAgo = (lang: typeof translation, jsDate: Date, timeStyle: FixedFormatStyle) => {
  const date = toTemporalInstant.bind(jsDate)().toZonedDateTimeISO(Temporal.Now.timeZoneId());
  const now = Temporal.Now.zonedDateTimeISO(Temporal.Now.timeZoneId());

  const dayDiff = date.startOfDay().until(now.startOfDay(), { largestUnit: 'day' }).days;

  return dayDiff === 0
    ? date.hour < 5
      ? lang.YESTERDAY_NIGHT
      : lang.TODAY
    : dayDiff === 1
    ? lang.YESTERDAY
    : timeAgo.format(jsDate, timeStyle);
};

export const getShortTimeAgo = (lang: typeof translation, jsDate: Date) => {
  return getTimeAgo(lang, jsDate, {
    flavour: 'tiny',
    gradation: convenient,
    units: ['day', 'week', 'month'],
  });
};
export const getLongTimeAgo = (lang: typeof translation, jsDate: Date) => {
  return getTimeAgo(lang, jsDate, {
    flavour: 'long',
    gradation: convenient,
    units: ['day', 'week', 'month'],
  });
};
