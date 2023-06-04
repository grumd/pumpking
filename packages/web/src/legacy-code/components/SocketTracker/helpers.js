import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import _ from 'lodash/fp';
import TimeAgo from 'javascript-time-ago';
import ru from 'javascript-time-ago/locale/ru';
import { convenient } from 'javascript-time-ago/gradation';
import moment from 'moment';

import { labelToTypeLevel } from 'legacy-code/utils/leaderboards';

TimeAgo.addLocale(ru);
const timeAgo = new TimeAgo('ru-RU');
const timeStyle = {
  flavour: 'short',
  gradation: convenient,
  units: ['day', 'week', 'month'],
};
export const getTimeAgo = (lang, date) => {
  const dayDiff = moment().startOf('day').diff(moment(date).startOf('day'), 'days');
  return dayDiff === 0
    ? lang.TODAY
    : dayDiff === 1
    ? lang.YESTERDAY
    : timeAgo
        .format(date, timeStyle)
        .replace('назад', '')
        .replace('дн', lang.DAYS_SHORT)
        .replace('нед', lang.WEEKS_SHORT)
        .replace('мес', lang.MONTHS_SHORT);
};

export const preprocessData = (data) => ({
  ...data,
  results: _.flow(
    _.get('results'),
    _.toPairs,
    _.map(([chartId, item]) => {
      const fullRes = _.find(
        (r) => _.every(_.isNumber, [r.perfects, r.greats, r.goods, r.bads, r.misses]),
        item.results
      );
      const stepSum =
        fullRes &&
        [fullRes.perfects, fullRes.greats, fullRes.goods, fullRes.bads, fullRes.misses].reduce(
          (sum, n) => sum + n,
          0
        );

      const [chartType, chartLevel] = labelToTypeLevel(item.chart_label);

      return {
        song: item.track,
        sharedChartId: _.toNumber(chartId),
        chartLabel: item.chart_label,
        chartLevel,
        chartType,
        mix: item.mix,
        duration: item.duration,
        results: item.results.map((res, index) => {
          let resultInfoOverrides = {};
          if (stepSum) {
            const infos = [res.perfects, res.greats, res.goods, res.bads, res.misses];
            let fixableIndex = -1;
            let localStepSum = 0;
            const canFix =
              infos.filter((numb, index) => {
                if (!_.isNumber(numb)) {
                  fixableIndex = index;
                  return true;
                }
                localStepSum += numb;
                return false;
              }).length === 1;
            if (canFix) {
              resultInfoOverrides[['perfect', 'great', 'good', 'bad', 'miss'][fixableIndex]] =
                stepSum - localStepSum;
            }
          }
          return {
            id: res.id,
            playerId: res.player,
            nickname: data.players[res.player].nickname,
            nicknameArcade: data.players[res.player].arcade_name,
            originalChartMix: res.originalChartMix,
            originalChartLabel: res.originalChartLabel,
            originalScore: res.originalScore,
            date: res.gained,
            dateObject: new Date(res.gained),
            grade: res.grade,
            isExactDate: !!res.exact_gain_date,
            score: res.score,
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
            ...resultInfoOverrides,
          };
        }),
      };
    }),
    _.map((song) => {
      return {
        ...song,
        latestScoreDate: song.results.reduce(
          (latest, current) => (current.date > latest ? current.date : latest),
          song.results[0].date
        ),
        results: song.results.map((res) => {
          const perfects = (Math.sqrt(res.perfect) * _.toInteger(song.chartLevel)) / 2;
          const acc = perfects
            ? Math.floor(
                ((perfects * 100 + res.great * 60 + res.good * 30 + res.miss * -20) /
                  (perfects + res.great + res.good + res.bad + res.miss)) *
                  100
              ) / 100
            : null;
          const accRaw = res.perfect
            ? Math.floor(
                ((res.perfect * 100 + res.great * 60 + res.good * 30 + res.miss * -20) /
                  (res.perfect + res.great + res.good + res.bad + res.miss)) *
                  100
              ) / 100
            : null;
          return {
            ...res,
            accuracy: acc < 0 ? 0 : accRaw === 100 ? 100 : acc && +acc.toFixed(2),
            accuracyRaw: accRaw,
            hasRankScore: _.some({ playerId: res.playerId, isRank: true }, song.results),
          };
        }),
      };
    }),
    _.orderBy(['latestScoreDate', 'song', 'chartLevel'], ['desc', 'asc', 'desc'])
  )(data),
});

export const useTrackedEx = ({
  data,
  resetData,
  onChange = _.noop,
  isDataValid = _.identity,
  isDebugOn = false,
}) => {
  const [prevData, setPrevData] = useState(data);
  const [currData, setCurrData] = useState(data);
  const resetIndicator = useRef(resetData);

  useEffect(() => {
    // isDebugOn && console.log('tracking effect', resetIndicatorData, data, currData, prevData);
    if (resetIndicator.current !== resetData) {
      // isDebugOn && console.log('resetting due to indicator chage', data);
      resetIndicator.current = resetData;
      setPrevData(data);
      setCurrData(data);
    } else if (isDataValid(data) && !_.isEqual(data, currData)) {
      // isDebugOn && console.log('data has updated', data, currData);
      setPrevData(currData);
      setCurrData(data);
      onChange(currData, data);
    }
  }, [data, onChange, currData, prevData, resetData, isDataValid]);

  const reset = useCallback(() => {
    // isDebugOn && console.log('reset called from function');
    setPrevData(data);
    setCurrData(data);
  }, [data]);

  return useMemo(() => [currData, prevData, reset], [currData, prevData, reset]);
};

export const useTracked = (data, resetIndicatorData, onChange = _.noop, isDebugOn) => {
  const [prevData, setPrevData] = useState(data);
  const [currData, setCurrData] = useState(data);
  const resetIndicator = useRef(resetIndicatorData);

  useEffect(() => {
    // isDebugOn && console.log('tracking effect', resetIndicatorData, data, currData, prevData);
    if (resetIndicator.current !== resetIndicatorData) {
      // isDebugOn && console.log('resetting due to indicator chage', data);
      resetIndicator.current = resetIndicatorData;
      setPrevData(data);
      setCurrData(data);
    } else if (data && !_.isEqual(data, currData)) {
      // isDebugOn && console.log('data has updated', data, currData);
      setPrevData(currData);
      setCurrData(data);
      onChange(currData, data);
    }
  }, [data, onChange, currData, prevData, resetIndicatorData]);

  const reset = useCallback(() => {
    // isDebugOn && console.log('reset called from function');
    setPrevData(data);
    setCurrData(data);
  }, [data]);

  return useMemo(() => [currData, prevData, reset], [currData, prevData, reset]);
};

export const useResetTrackedObject = (object) => {
  return useCallback(() => {
    const trackings = _.values(object);
    trackings.forEach((tracking) => tracking[2]());
  }, [object]);
};
