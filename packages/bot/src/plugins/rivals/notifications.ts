import type { BotPlayer } from '../../platform/players';
import type { BotServices } from '../../platform/types';
import {
  getBestResults,
  getChartInfo,
  getRecentlyUpdatedCharts,
  getResultForNotifications,
  type BestResult,
  type ChartInfo,
} from './results';
import {
  briefResult,
  chartHeader,
  nowYoureOnPar,
  youGotNewResultAndWon,
  youImprovedYourResult,
  youreDefeatedOrOnPar,
  youveBeatAllYourRivals,
  yourNextRivalIs,
} from './texts';

export interface Notification {
  recipient: BotPlayer;
  html: string;
}

const shouldNotifyPlayer = (
  chart: ChartInfo,
  player: BotPlayer,
  rival: BotPlayer,
  opts: { limitLevels: boolean; showStronger: boolean; showWeaker: boolean }
) => {
  const rivals = player.preferences?.rivals;
  if (player.telegramId == null || !rivals || !rivals.track) {
    return false;
  }
  if (opts.limitLevels && !(rivals.levels[0] <= chart.level! && chart.level! <= rivals.levels[1])) {
    return false;
  }
  if (rivals.list.includes(rival.id)) {
    return true;
  }
  if (rivals.trackInferior) {
    if (rival.pp > player.pp && opts.showStronger) {
      return true;
    }
    if (rival.pp <= player.pp && opts.showWeaker) {
      return true;
    }
  }
  return false;
};

const shouldMentionLoserOrEqual = (chart: ChartInfo, res: BestResult, beaten: BestResult) => {
  const resultImproved = res.scoreIncrease != null && res.scoreIncrease < res.score;
  return shouldNotifyPlayer(chart, res.player, beaten.player, {
    limitLevels: false,
    showStronger: true,
    showWeaker: resultImproved,
  });
};

const shouldMentionBetterResult = (chart: ChartInfo, res: BestResult, better: BestResult) =>
  shouldNotifyPlayer(chart, res.player, better.player, {
    limitLevels: false,
    showStronger: true,
    showWeaker: true,
  });

const shouldNotifyAboutLoss = (chart: ChartInfo, res: BestResult, newRes: BestResult) =>
  shouldNotifyPlayer(chart, res.player, newRes.player, {
    limitLevels: true,
    showStronger: false,
    showWeaker: true,
  });

const shouldNotifyAboutEqual = (chart: ChartInfo, res: BestResult, newRes: BestResult) =>
  shouldNotifyPlayer(chart, res.player, newRes.player, {
    limitLevels: true,
    showStronger: true,
    showWeaker: true,
  });

const shouldMentionOther = (chart: ChartInfo, beatenOrEqual: BestResult, other: BestResult) =>
  shouldNotifyPlayer(chart, beatenOrEqual.player, other.player, {
    limitLevels: false,
    showStronger: beatenOrEqual.score >= other.score,
    showWeaker: beatenOrEqual.score <= other.score,
  });

const winningScoreMessage = (
  chart: ChartInfo,
  res: BestResult,
  beaten: BestResult[],
  equal: BestResult[],
  closest: BestResult | undefined
) => {
  const lang = res.player.region ?? 'EN';
  let message = chartHeader(chart);

  if (beaten.length > 0) {
    message += '\n\n' + youGotNewResultAndWon(lang, res) + '\n';
    for (const rivalRes of beaten) {
      message +=
        '\n  ' +
        briefResult(lang, rivalRes, {
          bullet: '•',
          showName: true,
          highlightName: true,
          showScore: true,
        });
    }
  } else {
    message += '\n\n' + youImprovedYourResult(lang, res);
  }

  if (equal.length > 0) {
    message += '\n\n' + nowYoureOnPar(lang) + '\n';
    for (const rivalRes of equal) {
      message +=
        '\n  ' +
        briefResult(lang, rivalRes, {
          bullet: '•',
          showName: true,
          highlightName: true,
          showScore: false,
        });
    }
  }

  if (closest) {
    message += '\n\n' + yourNextRivalIs(lang, closest);
  } else if (equal.length === 0) {
    message += '\n\n' + youveBeatAllYourRivals(lang);
  }
  return message;
};

const beatenOrEqualScoreMessage = (
  chart: ChartInfo,
  newRes: BestResult,
  rivalRes: BestResult,
  resultsOfInterest: BestResult[]
) => {
  const lang = rivalRes.player.region ?? 'EN';
  let message = chartHeader(chart) + '\n\n' + youreDefeatedOrOnPar(lang, newRes, rivalRes) + '\n';

  let list = '';
  for (const res of resultsOfInterest) {
    if (res.id === newRes.id) {
      if (list !== '') {
        list += '\n';
      }
      list +=
        '\n  ' +
        briefResult(lang, res, {
          bullet: '↑ ',
          showName: true,
          highlightName: true,
          showScore: true,
        }) +
        '\n';
    } else if (res.id === rivalRes.id) {
      list +=
        '\n  ' +
        briefResult(lang, res, {
          bullet: '→ ',
          showName: false,
          highlightName: true,
          showScore: true,
        });
    } else {
      list +=
        '\n  ' +
        briefResult(lang, res, {
          bullet: '•',
          showName: true,
          highlightName: false,
          showScore: true,
        });
    }
  }
  return message + list;
};

export const rivalsNotifications = (
  chart: ChartInfo,
  newRes: BestResult,
  rivalResults: BestResult[]
): Notification[] => {
  const scoreIncrease = newRes.scoreIncrease || newRes.score;

  const rivals = [...rivalResults].sort((a, b) => b.score - a.score || b.player.pp - a.player.pp);

  const isBeaten = (r: BestResult) =>
    newRes.score - scoreIncrease <= r.score && r.score < newRes.score;
  const isBeatenOrEqual = (r: BestResult) =>
    newRes.score - scoreIncrease <= r.score && r.score <= newRes.score;

  const beaten = rivals.filter(isBeaten);
  const equal = rivals.filter((r) => r.score === newRes.score);

  let closest: BestResult | undefined;
  for (const rivalRes of rivals) {
    if (rivalRes.score > newRes.score && shouldMentionBetterResult(chart, newRes, rivalRes)) {
      if (
        !closest ||
        rivalRes.score < closest.score ||
        (rivalRes.score === closest.score && rivalRes.player.pp < closest.player.pp)
      ) {
        closest = rivalRes;
      }
    }
  }

  const notifications: Notification[] = [
    {
      recipient: newRes.player,
      html: winningScoreMessage(
        chart,
        newRes,
        beaten.filter((r) => shouldMentionLoserOrEqual(chart, newRes, r)),
        equal.filter((r) => shouldMentionLoserOrEqual(chart, newRes, r)),
        closest
      ),
    },
  ];

  const toNotify = [
    ...beaten.filter((r) => shouldNotifyAboutLoss(chart, r, newRes)),
    ...equal.filter((r) => shouldNotifyAboutEqual(chart, r, newRes)),
  ];
  for (const rivalRes of toNotify) {
    const resultsOfInterest = rivals.filter(
      (r) =>
        r.id === rivalRes.id ||
        ((isBeatenOrEqual(r) || r.score >= rivalRes.score) &&
          shouldMentionOther(chart, rivalRes, r))
    );
    resultsOfInterest.push(newRes);
    resultsOfInterest.sort((a, b) => b.score - a.score);
    notifications.push({
      recipient: rivalRes.player,
      html: beatenOrEqualScoreMessage(chart, newRes, rivalRes, resultsOfInterest),
    });
  }

  return notifications;
};

export const notificationsForResult = async (resultId: number): Promise<Notification[]> => {
  const result = await getResultForNotifications(resultId);
  if (!result) {
    return [];
  }
  const chart = await getChartInfo(result.shared_chart);
  if (!chart || chart.level == null) {
    return [];
  }
  const bestResults = await getBestResults(chart.id, Number(result.rankMode));
  const newRes = bestResults.find((res) => res.id === resultId);
  if (!newRes) {
    return [];
  }
  return rivalsNotifications(
    chart,
    newRes,
    bestResults.filter((res) => res.player.id !== newRes.player.id)
  );
};

export const replayNotifications = async (
  minutes: number,
  testPlayer: BotPlayer
): Promise<Notification[]> => {
  const notifications: Notification[] = [];
  for (const sharedChartId of await getRecentlyUpdatedCharts(minutes)) {
    const chart = await getChartInfo(sharedChartId);
    if (!chart || chart.level == null) {
      continue;
    }
    for (const rankMode of [0, 1]) {
      const bestResults = await getBestResults(chart.id, rankMode);
      for (const newRes of bestResults.filter((res) => res.addedSecondsAgo < minutes * 60)) {
        const rivals = bestResults.filter((res) => res.player.id !== newRes.player.id);
        notifications.push(...rivalsNotifications(chart, newRes, rivals));
      }
    }
  }
  return notifications.filter((n) => n.recipient.id === testPlayer.id);
};

export const sendNotifications = async (
  bot: BotServices,
  resultId: number,
  notifications: Notification[]
) => {
  for (const { recipient, html } of notifications) {
    if (recipient.telegramId != null) {
      console.log(`Bot: rivals: notifying ${recipient.nickname} about result ${resultId}`);
      await bot.sender.send(recipient.telegramId, html);
    }
  }
};
