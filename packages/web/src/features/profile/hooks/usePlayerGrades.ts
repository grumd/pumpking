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
      _.groupBy<(typeof totalCounts)[number]>('level'),
      (x) => _.values(x),
      _.map((levelTotals) => {
        const { level } = levelTotals[0];
        const gradeTotals = _.filter((x) => x.level === level, gradeCounts);
        const groupedByTypeGrade = _.groupBy((x) => `${x.type}-${x.grade}`, gradeTotals);
        const groupedByType = _.groupBy('type', gradeTotals);
        const groupedByGrade = _.groupBy('grade', gradeTotals);
        const totalChartsByType = _.mapValues(_.sumBy('count'), _.groupBy('type', levelTotals));
        const totalCharts = _.sum(_.values(totalChartsByType));
        const totalPlayedCharts = _.sumBy('count', gradeTotals);
        return {
          level,
          totalChartsByType,
          totalCharts,
          totalPlayedCharts,
          byTypeGrade: _.mapValues(_.sumBy('count'), groupedByTypeGrade),
          byGrade: _.mapValues(_.sumBy('count'), groupedByGrade),
          byType: _.mapValues(_.sumBy('count'), groupedByType),
        };
      })
    )(totalCounts);
  }, [data]);
};
