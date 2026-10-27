/// <reference types="node" />
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';

import { formatTimeAgo, getDaysAgo } from './daysAgo';

const kyiv = 'Europe/Kyiv';

describe('getDaysAgo', () => {
  const evening = new Date('2026-10-17T23:46:00+03:00');
  // Reported at 02:46 in Kyiv: this evening's play and last evening's were both "1d"
  const afterMidnight = new Date('2026-10-18T02:46:00+03:00');

  it('starts the day at 5am', () => {
    assert.equal(getDaysAgo(new Date('2026-10-17T21:52:00+03:00'), evening, kyiv), 'today');
    assert.equal(getDaysAgo(new Date('2026-10-17T05:00:00+03:00'), evening, kyiv), 'today');
    assert.equal(
      getDaysAgo(new Date('2026-10-17T04:59:00+03:00'), evening, kyiv),
      'yesterdayNight'
    );
    assert.equal(getDaysAgo(new Date('2026-10-16T19:25:00+03:00'), evening, kyiv), 'yesterday');
  });

  it('keeps this evening today after midnight', () => {
    assert.equal(getDaysAgo(new Date('2026-10-17T21:52:00+03:00'), afterMidnight, kyiv), 'today');
    assert.equal(getDaysAgo(new Date('2026-10-18T01:30:00+03:00'), afterMidnight, kyiv), 'today');
    assert.equal(
      getDaysAgo(new Date('2026-10-16T19:25:00+03:00'), afterMidnight, kyiv),
      'yesterday'
    );
    assert.equal(
      getDaysAgo(new Date('2026-10-17T01:30:00+03:00'), afterMidnight, kyiv),
      'yesterdayNight'
    );
    assert.equal(getDaysAgo(new Date('2026-10-15T23:00:00+03:00'), afterMidnight, kyiv), 2);
  });

  it('counts days, not hours passed', () => {
    const morning = new Date('2026-10-17T10:00:00+03:00');
    // 35 hours ago, two days back
    assert.equal(getDaysAgo(new Date('2026-10-15T23:00:00+03:00'), morning, kyiv), 2);
    assert.equal(getDaysAgo(new Date('2026-10-11T05:00:00+03:00'), morning, kyiv), 6);
  });

  it('counts a date in the future as today', () => {
    assert.equal(getDaysAgo(new Date('2026-10-18T06:30:00+03:00'), evening, kyiv), 'today');
    assert.equal(getDaysAgo(new Date('2026-10-19T12:00:00+03:00'), evening, kyiv), 'today');
  });

  it('uses the days of the time zone', () => {
    // Played the morning of the 17th in Kyiv, the evening of the 16th in Los Angeles
    const played = new Date('2026-10-17T03:30:00Z');
    const now = new Date('2026-10-17T20:00:00Z');
    assert.equal(getDaysAgo(played, now, kyiv), 'today');
    assert.equal(getDaysAgo(played, now, 'America/Los_Angeles'), 'yesterday');
  });

  it('counts a day with a clock change as one', () => {
    // Clocks go back on 2026-10-25 in Kyiv, that day has 25 hours
    const now = new Date('2026-10-27T10:00:00+02:00');
    assert.equal(getDaysAgo(new Date('2026-10-24T23:30:00+03:00'), now, kyiv), 3);
    assert.equal(getDaysAgo(new Date('2026-10-25T06:30:00+02:00'), now, kyiv), 2);
  });
});

describe('formatTimeAgo', () => {
  TimeAgo.addLocale(en);
  const timeAgo = new TimeAgo('en-US');
  const style = { flavour: 'tiny', units: ['day', 'week', 'month'] } as const;
  const labels = { today: '0d', yesterday: '1d', yesterdayNight: '1d' };
  const format = (date: string) => formatTimeAgo(timeAgo, style, labels, new Date(date), kyiv);

  afterEach(() => mock.timers.reset());

  it('shows this evening as 0d and last evening as 1d after midnight', () => {
    mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-18T02:46:00+03:00') });
    assert.equal(format('2026-10-17T22:04:00+03:00'), '0d');
    assert.equal(format('2026-10-16T19:25:00+03:00'), '1d');
    assert.equal(format('2026-10-15T19:25:00+03:00'), '2d');
  });

  it('formats whole days where timeAgo would round the hours', () => {
    mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-17T10:00:00+03:00') });
    // 35 hours: timeAgo alone says "1d"
    const twoDaysAgo = new Date('2026-10-15T23:00:00+03:00');
    assert.equal(timeAgo.format(twoDaysAgo.getTime(), style), '1d');
    assert.equal(format(twoDaysAgo.toISOString()), '2d');
  });

  it('counts days, then weeks and months', () => {
    mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-17T23:46:00+03:00') });
    assert.equal(format('2026-10-17T21:52:00+03:00'), '0d');
    assert.equal(format('2026-10-17T01:00:00+03:00'), '1d');
    assert.equal(format('2026-10-16T19:25:00+03:00'), '1d');
    assert.equal(format('2026-10-15T08:00:00+03:00'), '2d');
    assert.equal(format('2026-10-12T08:00:00+03:00'), '5d');
    assert.equal(format('2026-10-03T08:00:00+03:00'), '2wk');
    assert.equal(format('2023-11-20T20:00:00+02:00'), '35mo');
  });
});
