// Text helpers shared by the plugins, ported from the legacy bot (common.py, texts.py).
// `lang` is the player's region: RU and UA have their own texts, everything else is English

/** Escapes text for Telegram's HTML parse mode */
export const wrap = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** 1234567 -> "1,234,567", like Python's f"{n:,}" */
export const formatNumber = (n: number) => n.toLocaleString('en-US');

export const pluralEn = (words: [string, string], count: number) =>
  count === 1 ? words[0] : words[1];

export const pluralSlavic = (words: [string, string, string], count: number) => {
  if (count >= 11 && count <= 20) {
    return words[2];
  }
  if (count % 10 === 1) {
    return words[0];
  }
  if ([2, 3, 4].includes(count % 10)) {
    return words[1];
  }
  return words[2];
};

const hoursWord = (lang: string, count: number) => {
  if (lang === 'RU') {
    return pluralSlavic(['час', 'часа', 'часов'], count);
  }
  if (lang === 'UA') {
    return pluralSlavic(['годину', 'години', 'годин'], count);
  }
  return pluralEn(['hour', 'hours'], count);
};

const minutesWord = (lang: string, count: number) => {
  if (lang === 'RU') {
    return pluralSlavic(['минуту', 'минуты', 'минут'], count);
  }
  if (lang === 'UA') {
    return pluralSlavic(['хвилину', 'хвилини', 'хвилин'], count);
  }
  return pluralEn(['minute', 'minutes'], count);
};

/** "2 hours 5 minutes" / "5 minutes" */
export const durationText = (lang: string, totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60);
  if (hours >= 1) {
    const minutes = totalMinutes % 60;
    return `${hours} ${hoursWord(lang, hours)} ${minutes} ${minutesWord(lang, minutes)}`;
  }
  return `${totalMinutes} ${minutesWord(lang, totalMinutes)}`;
};

/** "1h 5m" / "5m 3s", for durations in seconds */
export const printableDuration = (totalSeconds: number) => {
  let minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hours = Math.floor(minutes / 60);
  minutes %= 60;

  const parts = [];
  if (hours >= 1) {
    parts.push(`${hours}h`);
  }
  if (minutes >= 1) {
    parts.push(`${minutes}m`);
  }
  if (hours === 0) {
    parts.push(`${seconds}s`);
  }
  return parts.join(' ');
};

/**
 * Parses the naive UTC "YYYY-MM-DD HH:MM:SS" strings of the agent activity queries
 * (plugins/locations/activity.ts) into milliseconds
 */
export const parseUtc = (naive: string) => Date.parse(`${naive.replace(' ', 'T')}Z`);

export const secondsAgo = (naive: string, now = Date.now()) =>
  Math.floor((now - parseUtc(naive)) / 1000);
