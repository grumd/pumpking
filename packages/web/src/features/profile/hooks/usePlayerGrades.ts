import _ from 'lodash/fp';
import { useMemo } from 'react';

import { api } from 'utils/trpc';

export const usePlayerGrades = ({ playerId }: { playerId: number | undefined }) => {
  return api.players.grades.useQuery(playerId);
};

export const useGradesGraphData = ({ playerId }: { playerId: number | undefined }) => {
  const { data } = usePlayerGrades({ playerId });

  return useMemo(() => {
    if (!data) {
      return null;
    }
    const { gradeCounts, totalCounts } = data;

    return _.flow(
      _.groupBy<(typeof gradeCounts)[number]>('level'),
      (x) => _.values(x),
      _.map((vals) => {
        const groupedByTypeGrade = _.groupBy((x) => `${x.type}-${x.grade}`, vals);
        const groupedByType = _.groupBy('type', vals);
        const groupedByGrade = _.groupBy('grade', vals);
        const levelTotals = _.filter((x) => x.level === vals[0].level, totalCounts);
        const totalChartsByType = _.mapValues(_.sumBy('count'), _.groupBy('type', levelTotals));
        const totalCharts = _.sum(_.values(totalChartsByType));
        const totalPlayedCharts = _.sumBy('count', vals);
        return {
          level: vals[0].level,
          totalChartsByType,
          totalCharts,
          totalPlayedCharts,
          byTypeGrade: _.mapValues(_.sumBy('count'), groupedByTypeGrade),
          byGrade: _.mapValues(_.sumBy('count'), groupedByGrade),
          byType: _.mapValues(_.sumBy('count'), groupedByType),
        };
      })
    )(gradeCounts);
  }, [data]);
};
