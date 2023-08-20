import React from 'react';
import _ from 'lodash/fp';
import TimeAgo from 'javascript-time-ago';
import ru from 'javascript-time-ago/locale/ru';
import { convenient } from 'javascript-time-ago/gradation';
import moment from 'moment';

import { parseDate } from 'legacy-code/utils/date';
import { getScoreWithoutBonus } from 'legacy-code/utils/score';
import { getExp } from 'legacy-code/utils/exp';
import { achievements, initialAchievementState } from 'legacy-code/utils/achievements';

TimeAgo.addLocale(ru);
const timeAgo = new TimeAgo('ru-RU');

const timeStyle = {
  flavour: 'long',
  gradation: convenient,
  units: ['day', 'week', 'month'],
};
export const tooltipFormatter = (lang, result) => {
  if (result.isManuallyAdded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
        {!result.isExactDate && <div>{lang.EXACT_DATE_UNKNOWN}</div>}
        <div>
          {lang.SCORE_ADDED_MANUALLY} {result.dateAddedObject.toLocaleDateString()}
        </div>
        {result.isExactDate && (
          <div>
            {lang.SCORE_WAS_TAKEN} {result.dateObject.toLocaleDateString()}
          </div>
        )}
      </div>
    );
  }

  if (!result.isExactDate) {
    const resultType =
      result.isMyBest === undefined && result.isMachineBest === undefined
        ? `${lang.FROM} my best ${lang.OR} machine best`
        : result.isMyBest
        ? `${lang.FROM} my best`
        : result.isMachineBest
        ? `${lang.FROM} machine best`
        : `???`;
    return (
      <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
        <div>{lang.EXACT_DATE_UNKNOWN}</div>
        <div>
          {lang.SCORE_WAS_TAKEN} {resultType}
        </div>
        <div>
          {lang.DATE_RECORDED}: {result.dateObject.toLocaleDateString()}
        </div>
      </div>
    );
  } else {
    return result.dateObject.toLocaleDateString();
  }
};

export const getTimeAgo = (lang, date) => {
  const dayDiff = moment().startOf('day').diff(moment(date).startOf('day'), 'days');
  const hour = moment(date).hour();
  if (moment().hour() < 5) {
    return dayDiff <= 1 ? lang.TODAY : timeAgo.format(date, timeStyle);
  }
  return dayDiff === 0
    ? hour < 5
      ? lang.YESTERDAY_NIGHT
      : lang.TODAY
    : dayDiff === 1
    ? lang.YESTERDAY
    : timeAgo.format(date, timeStyle); // TODO: translate date!
};

export const labelToTypeLevel = (label) => {
  const [type, level] = label ? label.match(/(\D+)|(\d+)/g) : [];
  return [type, level];
};

export const gradeComparator = {
  '?': 0,
  F: 1,
  D: 2,
  'D+': 3,
  C: 4,
  'C+': 5,
  B: 6,
  'B+': 7,
  A: 8,
  'A+': 9,
  S: 10,
  SS: 11,
  SSS: 12,
};

const tryFixIncompleteResult = (result, maxTotalSteps) => {
  if (!maxTotalSteps) {
    return;
  }
  const infos = [result.perfect, result.great, result.good, result.bad, result.miss];
  let fixableIndex = -1,
    absentNumbersCount = 0,
    localStepSum = 0;
  for (let i = 0; i < 5; ++i) {
    if (!_.isNumber(infos[i])) {
      fixableIndex = i;
      absentNumbersCount++;
    } else {
      localStepSum += infos[i];
    }
  }
  if (absentNumbersCount === 1) {
    result[['perfect', 'great', 'good', 'bad', 'miss'][fixableIndex]] =
      maxTotalSteps - localStepSum;
  }
};

const guessGrade = (result) => {
  if (result.misses === 0 && result.bads === 0 && result.goods === 0) {
    if (result.greats === 0) {
      return 'SSS';
    } else {
      return 'SS';
    }
  }
  return result.grade;
};

export const mapResult = (res, players, chart, chartId) => {
  const grade = res.grade !== '?' ? res.grade : guessGrade(res);

  if (typeof res.recognition_notes === 'undefined') {
    // Short result, minimum info, only for ELO calculation
    // Will be replaced with better result later
    return {
      id: res.id,
      isUnknownPlayer: players[res.player].nickname === '???',
      isIntermediateResult: true,
      sharedChartId: res.shared_chart || chartId,
      playerId: res.player,
      nickname: players[res.player].nickname,
      nicknameArcade: players[res.player].arcade_name,
      date: res.gained,
      dateObject: parseDate(res.gained),
      dateAdded: res.added,
      dateAddedObject: parseDate(res.added),
      grade,
      isExactDate: !!res.exact_gain_date,
      score: res.score,
      scoreRaw: getScoreWithoutBonus(res.score, grade),
      pp: res.pp || 0,
      isRank: !!res.rank_mode,
    };
  }
  // Full best result
  let _r = {
    isUnknownPlayer: players[res.player].nickname === '???',
    isIntermediateResult: false,
    sharedChartId: res.shared_chart || chartId,
    id: res.id,
    playerId: res.player,
    nickname: players[res.player].nickname,
    nicknameArcade: players[res.player].arcade_name,
    originalChartMix: res.original_mix,
    originalChartLabel: res.original_label,
    originalScore: res.original_score,
    date: res.gained,
    dateObject: parseDate(res.gained),
    dateAdded: res.added,
    dateAddedObject: parseDate(res.added),
    grade,
    isExactDate: !!res.exact_gain_date,
    score: res.score,
    scoreRaw: getScoreWithoutBonus(res.score, grade),
    pp: res.pp || 0,
    scoreIncrease: res.score_increase,
    calories: res.calories && res.calories / 1000,
    perfect: res.perfects,
    great: res.greats,
    good: res.goods,
    bad: res.bads,
    miss: res.misses,
    combo: res.max_combo,
    mods: res.mods_list,
    isRank: !!res.rank_mode,
    isHJ: (res.mods_list || '').includes('HJ'),
    isMachineBest: res.recognition_notes === 'machine_best',
    isMyBest: res.recognition_notes === 'personal_best',
    isManuallyAdded: res.recognition_notes === 'manual',
  };

  tryFixIncompleteResult(_r, chart.maxTotalSteps);

  const stepsSum = _r.perfect + _r.great + _r.good + _r.bad + _r.miss;

  _r.accuracyRaw =
    (100 *
      ((_r.perfect + _r.great * 0.6 + _r.good * 0.2 + _r.bad * 0.1) * 0.995 + _r.combo * 0.005)) /
    stepsSum;

  _r.accuracy =
    _r.accuracyRaw < 0
      ? 0
      : _r.accuracyRaw >= 100
      ? 100
      : _r.accuracyRaw && +_r.accuracyRaw.toFixed(2);

  return _r;
};

export const initializeProfile = (result, profiles, players) => {
  const id = result.playerId;
  const resultsByLevel = _.fromPairs(Array.from({ length: 28 }).map((x, i) => [i + 1, []]));

  profiles[id] = {
    id: id,
    name: players[id].nickname,
    pp: players[id].pp || 0,
    nameArcade: players[id].arcade_name,
    resultsByGrade: {},
    resultsByLevel,
    firstResultDate: result.dateObject,
    lastResultDate: result.dateObject,
    count: 0,
    battleCount: 0,
    countAcc: 0,
    grades: { F: 0, D: 0, C: 0, B: 0, A: 0, S: 0, SS: 0, SSS: 0 },
    sumAccuracy: 0,
    rankingHistory: [],
    ratingHistory: [],
    lastPlace: null,
    lastBattleDate: 0,
    region: players[id].region,
  };
  profiles[id].achievements = _.flow(
    _.keys,
    _.map((achName) => [
      achName,
      { ...(achievements[achName].initialState || initialAchievementState) },
    ]),
    _.fromPairs
  )(achievements);
  profiles[id].exp = 0;
};

export const getProfileInfoFromResult = (result, chart, profiles) => {
  const profile = profiles[result.playerId];

  profile.count++;
  if (result.accuracy) {
    profile.countAcc++;
    profile.sumAccuracy += result.accuracy;
  }
  profile.grades[result.grade.replace('+', '')]++;
  if (chart.chartType !== 'COOP') {
    profile.resultsByGrade[result.grade] = [
      ...(profile.resultsByGrade[result.grade] || []),
      { result, chart },
    ];
    profile.resultsByLevel[chart.chartLevel] = [
      ...(profile.resultsByLevel[chart.chartLevel] || []),
      { result, chart },
    ];
  }
  if (result.isExactDate && profile.lastResultDate < result.dateObject) {
    profile.lastResultDate = result.dateObject;
  }
  if (result.isExactDate && profile.firstResultDate > result.dateObject) {
    profile.firstResultDate = result.dateObject;
  }
  profile.exp += getExp(result, chart);
};

export const getMaxRawScore = (score) => {
  return ((score.scoreRaw / score.accuracy) * 100) / (score.isRank ? 1.2 : 1);
};
