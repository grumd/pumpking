import _ from 'lodash/fp';

import { ranks as expRanks } from 'legacy-code/utils/expRanks';
import { achievements } from '../achievements';

const postProcessProfiles = (profiles, tracklist) => {
  const getBonusForLevel = (level) => (30 * (1 + 2 ** (level / 4))) / 11;
  const getMinimumNumber = (totalCharts) =>
    Math.round(
      Math.min(totalCharts, 1 + totalCharts / 20 + Math.sqrt(Math.max(totalCharts - 1, 0)) * 0.7)
    );

  const newProfiles = _.mapValues((profile) => {
    const bestGradeResultsByLevel = {};
    Object.entries(profile.resultsByLevel).forEach(([index, results]) => {
      const filteredResults = {};
      results.forEach((result) => {
        const updatedResult = { ...result, result: result.result.bestGradeResult || result.result };
        const chartId = updatedResult.chart.sharedChartId;

        if (!filteredResults[chartId] || updatedResult.result.isBestGradeOnChart) {
          filteredResults[chartId] = updatedResult;
        }

        profile.achievements = _.mapValues.convert({ cap: false })((achState, achName) => {
          return achievements[achName].resultFunction(
            result.result,
            result.chart,
            achState,
            profile
          );
        }, profile.achievements);
      });
      bestGradeResultsByLevel[index] = Object.values(filteredResults);
    });

    profile.bestGradeResultsByLevel = bestGradeResultsByLevel;

    const neededGrades = ['A', 'A+', 'S', 'SS', 'SSS'];
    profile.expRank = _.findLast((rank) => rank.threshold <= profile.exp, expRanks);
    profile.expRankNext = _.find((rank) => rank.threshold > profile.exp, expRanks);
    profile.progress = {
      double: {
        SS: {},
        S: {},
        'A+': {},
        A: {},
      },
      single: {
        SS: {},
        S: {},
        'A+': {},
        A: {},
      },
    };
    const gradeIncrementMap = {
      SSS: ['SS', 'S', 'A+', 'A'],
      SS: ['SS', 'S', 'A+', 'A'],
      S: ['S', 'A+', 'A'],
      'A+': ['A+', 'A'],
      A: ['A'],
    };
    const incrementLevel = (l, g, chartType) => {
      const prog =
        chartType === 'S' || chartType === 'SP'
          ? profile.progress.single
          : chartType === 'D' || chartType === 'DP'
          ? profile.progress.double
          : null;
      if (prog) {
        prog[g][l] = prog[g][l] ? prog[g][l] + 1 : 1;
      }
    };

    profile.accuracyPointsRaw = [];
    _.keys(profile.bestGradeResultsByLevel).forEach((level) => {
      profile.bestGradeResultsByLevel[level].forEach((res) => {
        if (!res.result.isRank && res.result.accuracyRaw) {
          profile.accuracyPointsRaw.push([
            _.toNumber(level),
            res.result.accuracyRaw,
            res.result.sharedChartId,
          ]);
        }

        const thisGrade = res.result.grade;
        const thisPlayerId = res.result.playerId;
        const otherResults = res.chart.results.filter((r) => r.playerId === thisPlayerId);
        if (otherResults.length > 1) {
          const sortedResults = otherResults.sort(
            (a, b) => neededGrades.indexOf(b.grade) - neededGrades.indexOf(a.grade)
          );
          if (sortedResults[0].grade !== thisGrade) {
            return; // Don't do anything when we have a different result with better grade
          }
        }
        const gradeIncArray = gradeIncrementMap[thisGrade];
        if (gradeIncArray) {
          gradeIncArray.forEach((gradeInc) => {
            incrementLevel(level, gradeInc, res.chart.chartType);
          });
        }
      });
    });

    ['single', 'double'].forEach((chartType) => {
      profile.progress[`${chartType}-bonus`] = 0;
      _.keys(profile.progress[chartType]).forEach((grade) => {
        profile.progress[chartType][`${grade}-bonus`] = 0;
        _.keys(profile.progress[chartType][grade]).forEach((level) => {
          const number = profile.progress[chartType][grade][level];
          const totalCharts = tracklist.data[`${chartType}sLevels`][level];
          const minimumNumber = getMinimumNumber(totalCharts);
          const bonusCoefficientNumber = Math.min(1, number / minimumNumber);
          const rawBonus = getBonusForLevel(level);
          const bonus = rawBonus * bonusCoefficientNumber;
          profile.progress[chartType][grade][`${level}-bonus`] = bonus;
          profile.progress[chartType][grade][`${level}-bonus-coef`] = bonusCoefficientNumber;
          profile.progress[chartType][grade][`${level}-min-number`] = minimumNumber;
          profile.progress[chartType][grade][`${level}-achieved-number`] = number;
          if (bonus >= profile.progress[chartType][`${grade}-bonus`]) {
            profile.progress[chartType][`${grade}-bonus`] = bonus;
            profile.progress[chartType][`${grade}-bonus-level`] = level;
            profile.progress[chartType][`${grade}-bonus-level-coef`] = bonusCoefficientNumber;
            profile.progress[chartType][`${grade}-bonus-level-min-number`] = minimumNumber;
            profile.progress[chartType][`${grade}-bonus-level-achieved-number`] = number;
          }
        });
        profile.progress[`${chartType}-bonus`] += profile.progress[chartType][`${grade}-bonus`];
      });
    });
    profile.progress.bonus = profile.progress['double-bonus'] + profile.progress['single-bonus'];
    profile.achievementBonus = profile.progress.bonus;
    profile.accuracy =
      profile.countAcc > 0
        ? Math.round((profile.sumAccuracy / profile.countAcc) * 100) / 100
        : null;
    return profile;
  }, profiles);
  return newProfiles;
};

const processPP = ({ profiles, sharedCharts }) => {
  // Add first values for rankingHistory and ratingHistory
  _.flow(
    _.values,
    _.orderBy((profile) => profile.rating, 'desc'),
    (items) =>
      items.forEach((profile, index) => {
        profile.ratingHistory.push({
          rating: profile.rating,
          date: profile.firstResultDate.getTime(),
        });
        profile.rankingHistory.push({
          place: index + 1,
          date: profile.firstResultDate.getTime(),
        });
      })
  )(profiles);
};

export const getProcessedProfiles = ({ profiles, sharedCharts, tracklist, debug }) => {
  // Calculate Progress achievements and bonus for starting Elo
  profiles = postProcessProfiles(profiles, tracklist);

  // Calculate PP
  processPP({
    profiles,
    sharedCharts,
  });

  return { profiles, sharedCharts, logText: '' };
};

export default getProcessedProfiles;
