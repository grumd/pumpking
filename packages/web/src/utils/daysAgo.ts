import type TimeAgo from 'javascript-time-ago';
import type { FixedFormatStyle } from 'javascript-time-ago';
import { Temporal } from 'temporal-polyfill';

export type DaysAgo = 'today' | 'yesterday' | 'yesterdayNight' | number;

const DAY_MS = 24 * 60 * 60 * 1000;

// Nights belong to the evening before: the day of a play, and of now, starts at 5am
const DAY_START_HOURS = 5;

const toZoned = (date: Date, timeZone: string) =>
  Temporal.Instant.fromEpochMilliseconds(date.getTime()).toZonedDateTimeISO(timeZone);

const toDay = (zoned: Temporal.ZonedDateTime) =>
  zoned.subtract({ hours: DAY_START_HOURS }).toPlainDate();

/**
 * How many days ago the date was, in days of the time zone that start at 5am. Not hours passed:
 * last evening is "yesterday" all day. At 2am this evening is still "today", and last night
 * after midnight is "yesterdayNight". A date in the future is "today". From two days on, the
 * number of days
 */
export const getDaysAgo = (date: Date, now: Date, timeZone: string): DaysAgo => {
  const zonedDate = toZoned(date, timeZone);
  const days = toDay(zonedDate).until(toDay(toZoned(now, timeZone))).days;

  if (days <= 0) {
    return 'today';
  }
  if (days === 1) {
    return zonedDate.hour < DAY_START_HOURS ? 'yesterdayNight' : 'yesterday';
  }
  return days;
};

/** The labels for today and yesterday, then `timeAgo`'s "2d", "1wk", "3mo"... */
export const formatTimeAgo = (
  timeAgo: TimeAgo,
  style: FixedFormatStyle,
  labels: Record<Exclude<DaysAgo, number>, string>,
  date: Date,
  timeZone: string
) => {
  const now = Date.now();
  const daysAgo = getDaysAgo(date, new Date(now), timeZone);
  if (typeof daysAgo === 'string') {
    return labels[daysAgo];
  }
  // Formats whole days: timeAgo rounds the time passed, so the evening two days ago was "1d"
  // like yesterday's when less than 36 hours had passed
  return timeAgo.format(now - daysAgo * DAY_MS, style);
};
