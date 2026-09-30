import { formatNumber, wrap } from '../../platform/texts';
import type { BestResult, ChartInfo } from './results';

// The texts of the rivals notifications, as in the legacy bot's rivals.py

const byLang = (lang: string, texts: { RU: string; UA: string; EN: string }) =>
  lang === 'RU' ? texts.RU : lang === 'UA' ? texts.UA : texts.EN;

const timeAgo = (lang: string, res: BestResult) => {
  const mins = res.addedMinsAgo;
  if (mins < 3) {
    return '';
  }
  const hours = Math.floor(mins / 60);
  if (hours < 2) {
    return `  <i>~${mins}${byLang(lang, { RU: 'мин', UA: 'хв', EN: 'min' })}</i>`;
  }
  const days = Math.floor(hours / 24);
  if (days < 2) {
    return `  <i>~${hours}${byLang(lang, { RU: 'час', UA: 'год', EN: 'hrs' })}</i>`;
  }
  const months = Math.floor(days / 30);
  if (months < 3) {
    return `  <i>~${days}${byLang(lang, { RU: 'д', UA: 'д', EN: 'd' })}</i>`;
  }
  return `  <i>~${months}${byLang(lang, { RU: 'м', UA: 'м', EN: 'm' })}</i>`;
};

const WEB_CHART_URL = (chartId: number) => `https://pumpking.top/#/leaderboard/chart/${chartId}`;

export const chartHeader = (chart: ChartInfo) =>
  `<a href="${WEB_CHART_URL(chart.id)}"><b>${wrap(chart.trackName)}  ${wrap(
    chart.chartLabel
  )}</b></a>:`;

// "best" marks a score that came from a personal / machine best, not from a play
const scoreAndTimeAgo = (lang: string, res: BestResult, showBest = false) => {
  const best =
    showBest && !res.exactGainDate
      ? `${byLang(lang, { RU: 'бест', UA: 'бест', EN: 'best' })} `
      : '';
  return `${best}<code>${formatNumber(res.score)}</code>${timeAgo(lang, res)}`;
};

export const youImprovedYourResult = (lang: string, res: BestResult) => {
  const score = scoreAndTimeAgo(lang, res, true);
  return byLang(lang, {
    RU: `Ты получаешь ${score}, улучшая навык.`,
    UA: `Ти отримуєш ${score}, покращуючи навички.`,
    EN: `You've got ${score}, improving your skill.`,
  });
};

export const youGotNewResultAndWon = (lang: string, res: BestResult) => {
  const score = scoreAndTimeAgo(lang, res, true);
  return byLang(lang, {
    RU: `Ты получаешь ${score}, победив:`,
    UA: `Ти отримуєш ${score}, перемігши:`,
    EN: `You've got ${score}, overtaking:`,
  });
};

export const nowYoureOnPar = (lang: string) =>
  byLang(lang, {
    RU: 'Теперь ты наравне с:',
    UA: 'Тепер ти на рівних із:',
    EN: "Now you're on par with:",
  });

const playerName = (res: BestResult, highlight = true) => {
  const name = wrap(res.player.nickname);
  return highlight ? `<b>${name}</b>` : name;
};

export const youreDefeatedOrOnPar = (lang: string, res: BestResult, rivalRes: BestResult) => {
  const name = playerName(res);
  if (res.score > rivalRes.score) {
    const diff = formatNumber(res.score - rivalRes.score);
    return byLang(lang, {
      RU: `${name} опережает твой рекорд на <code>${diff}</code> очков:`,
      UA: `${name} випереджає твій рекорд на <code>${diff}</code> очок:`,
      EN: `${name} overtook your record by <code>${diff}</code> points:`,
    });
  }
  return byLang(lang, {
    RU: `${name} нагоняет твой рекорд:`,
    UA: `${name} наздоганяє твій рекорд:`,
    EN: `${name} catches up your record:`,
  });
};

export const briefResult = (
  lang: string,
  res: BestResult,
  opts: { bullet: string; showName: boolean; highlightName: boolean; showScore: boolean }
) => {
  const details = opts.showScore ? scoreAndTimeAgo(lang, res) : timeAgo(lang, res);
  let name = opts.showName
    ? playerName(res, false)
    : byLang(lang, { RU: 'твой', UA: 'твій', EN: 'yours' });
  if (opts.highlightName) {
    name = `<b>${name}</b>`;
  }
  return `${opts.bullet} ${name}  -  ${details}`;
};

export const yourNextRivalIs = (lang: string, closest: BestResult) => {
  const name = wrap(closest.player.nickname);
  const score = scoreAndTimeAgo(lang, closest);
  return byLang(lang, {
    RU: `Твой следующий соперник - <b>${name}</b> с ${score}`,
    UA: `Твій наступний суперник - <b>${name}</b> із ${score}`,
    EN: `Your next rival is <b>${name}</b> with ${score}`,
  });
};

export const youveBeatAllYourRivals = (lang: string) =>
  byLang(lang, {
    RU: 'Ты побеждаешь всех своих соперников!',
    UA: 'Ти перемагаєш всіх своїх суперників!',
    EN: 'You surpass all your rivals!',
  });
