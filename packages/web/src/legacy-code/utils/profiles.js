import _ from 'lodash/fp';
import { createSelector } from 'reselect';
import moment from 'moment';

const cutRange = (array, range) => {
  const startIndex = _.findIndex((item) => item.date > range[0], array);
  const endIndex = _.findLastIndex((item) => item.date < range[1], array);
  let firstElement =
    startIndex > 0 ? array[startIndex - 1] : startIndex === 0 ? array[startIndex] : _.last(array);
  let lastElement = endIndex > -1 ? array[endIndex] : _.first(array);
  firstElement = { ...firstElement, date: range[0] };
  lastElement = { ...lastElement, date: range[1] };
  const middleElements =
    startIndex > -1 && endIndex > -1 ? array.slice(startIndex, endIndex + 1) : [];

  return [firstElement, ...middleElements, lastElement];
};

const defaultGradesDistribution = {
  SSS: 0,
  SS: 0,
  S: 0,
  'A+': 0,
  A: 0,
  B: 0,
  C: 0,
  D: 0,
  F: 0,
};
const defaultGradesWithLevelsDistribution = _.flow(
  _.flatMap((type) => {
    return _.flow(
      _.toPairs,
      _.map(([grade, value]) => [`${type}-${grade}`, value])
    )(defaultGradesDistribution);
  }),
  _.fromPairs
)(['S', 'D']);

export const profileSelectorCreator = (idParamName) =>
  createSelector(
    (state, props) => props.params[idParamName],
    (state) => state.charts.isLoading || state.results.isLoadingRanking,
    (state) => state.results.profiles,
    (state) => state.profiles.filter,
    (state) => state.tracklist.data,
    (idText, isLoading, profiles, filter, tracklist) => {
      const id = _.toInteger(idText);
      const profile = profiles[id];
      if (_.isEmpty(profile) || isLoading) {
        return null;
      }

      const levelsDistribution = _.flow(
        _.toPairs,
        _.map(([x, y]) => ({
          x: _.toInteger(x),
          S:
            (_.size(
              _.filter((res) => res.chart.chartType === 'S' || res.chart.chartType === 'SP', y)
            ) /
              tracklist.singlesLevels[x]) *
            100,
          D:
            (-_.size(
              _.filter((res) => res.chart.chartType === 'D' || res.chart.chartType === 'DP', y)
            ) /
              tracklist.doublesLevels[x]) *
            100,
        }))
      )(profile.bestGradeResultsByLevel);

      const gradesData = _.flow(
        _.toPairs,
        _.map(
          _.update('[1].result.grade', (grade) =>
            grade && grade.includes('+') && grade !== 'A+' ? grade.replace('+', '') : grade
          )
        )
      )(profile.bestGradeResultsByLevel);
      const gradesDistribution = _.flow(
        _.map(([x, y]) => ({
          x: _.toInteger(x),
          ...defaultGradesDistribution,
          ..._.omit('?', _.mapValues(_.size, _.groupBy('result.grade', y))),
        })),
        _.map((item) => {
          const grades = _.pick(Object.keys(defaultGradesDistribution), item);
          const sum = _.sum(_.values(grades));
          return {
            ...item,
            gradesValues: grades,
            ...(sum === 0 ? grades : _.mapValues((value) => (100 * value) / sum, grades)),
          };
        })
      )(gradesData);
      const gradesAndLevelsDistribution = _.flow(
        _.map(([x, y]) => {
          const groupedResults = _.groupBy('result.grade', y);
          const counts = _.omit(
            '?',
            _.mapValues(
              _.countBy((res) => {
                return res.chart.chartType === 'S' || res.chart.chartType === 'SP'
                  ? 'S'
                  : res.chart.chartType === 'D' || res.chart.chartType === 'DP'
                  ? 'D'
                  : 'Other';
              }),
              groupedResults
            )
          );
          const reduced = _.reduce(
            (acc, [grade, levelsData]) => {
              const accData = _.flow(
                _.toPairs,
                _.map(([type, count]) => [
                  `${type}-${grade}`,
                  type === 'S'
                    ? (count / tracklist.singlesLevels[x]) * 100
                    : (-count / tracklist.doublesLevels[x]) * 100,
                ]),
                _.fromPairs
              )(levelsData);
              return { ...acc, ...accData };
            },
            {},
            _.toPairs(counts)
          );

          return {
            x: _.toInteger(x),
            ...defaultGradesWithLevelsDistribution,
            ...reduced,
          };
        })
      )(gradesData);

      const lastTickRating = _.last(profile.ratingHistory)?.date;
      const lastTickRanking = _.last(profile.rankingHistory)?.date;
      const lastTick = lastTickRating > lastTickRanking ? lastTickRating : lastTickRanking; // End graph at either point
      const firstTick = _.first(profile.ratingHistory).date; // Start graph from the first battle of this player
      const lastDay = moment(lastTick).endOf('day');
      const firstDay = moment(firstTick).startOf('day');
      const minMaxRange = [firstDay / 1000 / 60 / 60 / 24, lastDay / 1000 / 60 / 60 / 24];

      const filterRange = filter.dayRange || [
        Math.max(minMaxRange[0], minMaxRange[1] - 30),
        minMaxRange[1],
      ];
      const dayRangeMs = [
        +moment(filterRange[0] * 1000 * 60 * 60 * 24).startOf('day'),
        +moment(filterRange[1] * 1000 * 60 * 60 * 24).endOf('day'),
      ];
      const placesChanges = cutRange(profile.rankingHistory, dayRangeMs);
      const ratingChanges = cutRange(profile.ratingHistory, dayRangeMs);

      const rank = 1 + _.findIndex({ id }, _.orderBy(['pp'], ['desc'], _.values(profiles)));

      return {
        ...profile,
        rank,
        minMaxRange,
        filterRange,
        levelsDistribution,
        gradesDistribution,
        gradesAndLevelsDistribution,
        placesChanges,
        ratingChanges,
      };
    }
  );
