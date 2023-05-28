import _ from 'lodash/fp';
import regression from 'regression';
import { DataPoint } from 'regression';

import { knex } from 'db';

import { mix } from 'constants/currentMix';
import { getGroupedBestResults, getAccuracyPercent } from 'utils/results';
import { Result } from 'models/Result';

type AccPoint = { level: number; scorePercent: number };

export default async () => {
  const allResults = await knex
    .query(Result)
    .innerJoinColumn('shared_chart')
    .innerJoinColumn('chart_instance')
    .innerJoinColumn('player')
    .select(
      'id',
      'score_xx',
      'grade',
      'perfects',
      'greats',
      'goods',
      'bads',
      'misses',
      'rank_mode',
      'shared_chart.id',
      'player.id',
      'player.nickname',
      'chart_instance.level'
    )
    .where('player.hidden', 0)
    .where('is_new_best_score', 1)
    .where('rank_mode', 0)
    .where('mix', mix)
    .where('chart_label', 'NOT LIKE', 'COOP%')
    .orderBy('gained', 'desc')
    .getMany();

  /**
   * Group results by chart
   */
  const resultsByChart = getGroupedBestResults(allResults);

  /**
   * Recording accuracy of every player on different difficulty levels
   */
  let profiles: Record<number, { accuracyPointsRaw: AccPoint[]; nickname: string }> = {};
  _.forEach((chartResults) => {
    _.forEach((result) => {
      const percents = getAccuracyPercent(result);
      if (percents) {
        profiles[result.player.id] ??= {
          nickname: result.player.nickname,
          accuracyPointsRaw: [],
        };

        profiles[result.player.id].accuracyPointsRaw.push({
          level: result.chart_instance.level,
          scorePercent: percents,
        });
      }
    }, chartResults);
  }, resultsByChart);

  /**
   * Interpolating player's accuracy using logarithmic interpolation
   */
  profiles = _.pickBy((profile) => profile.accuracyPointsRaw.length > 50, profiles);

  const profilesInterpolated: Record<number, null | { pointsInterpolated: DataPoint[] }> =
    _.mapValues((profile) => {
      const maxScorePercent = _.maxBy(
        ({ scorePercent }) => scorePercent,
        profile.accuracyPointsRaw
      )?.scorePercent;
      const maxLevelWithMaxPercent = _.maxBy<AccPoint>(
        ({ level }) => level,
        _.filter(({ scorePercent }) => scorePercent === maxScorePercent, profile.accuracyPointsRaw)
      )?.level;
      if (!maxLevelWithMaxPercent || !maxScorePercent) {
        return null;
      }
      // Interpolating
      const points: DataPoint[] = profile.accuracyPointsRaw
        .filter(({ level }) => level >= maxLevelWithMaxPercent - 1)
        .map(({ level, scorePercent }) => [30 - level, 101 - scorePercent]);
      const regressed = regression.logarithmic(points);
      // Creating an interpolated function
      const f = (x: number): number => {
        const calculated = 101 - regressed.predict(30 - x)[1];
        return Math.max(0, Math.min(calculated, 100));
      };
      const yx: DataPoint[] = [];
      for (let x = 1; x <= 28; x += 0.1) {
        yx.push([x, f(x)]);
      }

      return { pointsInterpolated: yx };
    }, profiles);
  /**
   * Finding interpolated difficulty of every chart
   */
  const charts = _.mapValues((chartResults) => {
    // Looping through every chart result to find weights
    const resultsData = chartResults
      .filter((r) => !!profiles[r.player.id])
      .map((r) => {
        const profile = profilesInterpolated[r.player.id];
        const scorePercent = getAccuracyPercent(r);
        if (profile === null || scorePercent === null) {
          return null;
        }
        const interpolatedPoint = _.minBy(
          (pair) => Math.abs(pair[1] - scorePercent),
          profile.pointsInterpolated
        );
        if (interpolatedPoint === undefined) {
          return null;
        }
        const difficulty = interpolatedPoint[0];
        let weight =
          scorePercent > 98
            ? 1 - (scorePercent - 98) / (100 - 98)
            : scorePercent < 80
            ? Math.max(0, (scorePercent - 50) / (80 - 50))
            : 1;
        weight *= Math.min(
          1,
          Math.max(0.1, (8 - Math.abs(difficulty - r.chart_instance.level)) / 8)
        );
        return { difficulty, weight, r };
      });

    const sums = resultsData.reduce(
      (acc, item) => {
        if (!item) {
          return acc;
        }
        return {
          diffSum: acc.diffSum + item.difficulty * item.weight,
          weightSum: acc.weightSum + item.weight,
        };
      },
      { diffSum: 0, weightSum: 0 }
    );
    sums.diffSum += _.toNumber(chartResults[0].chart_instance.level) * 2;
    sums.weightSum += 2;
    return {
      level: chartResults[0].level,
      name: chartResults[0].track_name,
      difficulty: sums.diffSum / sums.weightSum,
      affectedBy: resultsData
        .filter((res) => res)
        .map((res) => {
          return {
            player: res?.r.player.nickname,
            difficultyGuess: res?.difficulty,
            weight: res?.weight,
          };
        }),
    };
  }, resultsByChart);
  return charts;
};
