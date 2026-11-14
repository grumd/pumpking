import type TimeAgo from 'javascript-time-ago';
import type { FixedFormatStyle } from 'javascript-time-ago';
import { Temporal } from 'temporal-polyfill';

export type DaysAgo = 'today' | 'yesterday' | 'yesterdayNight' | number;

const DAY_MS = 24 * 60 * 60 * 1000;

const DAY_START_HOURS = 5;

const toZoned = (date: Date, timeZone: string) =>
  Temporal.Instant.fromEpochMilliseconds(date.getTime()).toZonedDateTimeISO(timeZone);

const toDay = (zoned: Temporal.ZonedDateTime) =>
  zoned.subtract({ hours: DAY_START_HOURS }).toPlainDate();

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
  return timeAgo.format(now - daysAgo * DAY_MS, style);
};
