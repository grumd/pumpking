import _ from 'lodash/fp';
import regression from 'regression';
import { DataPoint } from 'regression';

import { db } from 'db';

import { mix } from 'constants/currentMix';

import { getGroupedBestResults, getAccuracyPercent } from 'utils/results';

type AccPoint = { level: number; scorePercent: number };

export default async () => {
  let allResults = await db
    .selectFrom('results')
    .innerJoin('chart_instances', 'chart_instances.id', 'results.chart_instance')
    .innerJoin('players', 'players.id', 'results.player_id')
    .innerJoin('tracks', 'tracks.id', 'chart_instances.track')
    .select([
      'id',
      'score_xx',
      'grade',
      'perfects',
      'greats',
      'goods',
      'bads',
      'misses',
      'rank_mode',
      'shared_chart as shared_chart_id',
      'player_id',
      'players.nickname',
      'chart_instances.level',
      'tracks.short_name as track_short_name',
    ])
    .where('players.hidden', '=', 0)
    .where('is_new_best_score', '=', 1)
    .where('rank_mode', '=', 0)
    .where('mix', '=', mix)
    .where('chart_label', 'not like', 'COOP%')
    .orderBy('gained', 'desc')
    .execute();

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
      if (percents && result.player_id && result.level) {
        profiles[result.player_id] ??= {
          nickname: result.nickname,
          accuracyPointsRaw: [],
        };

        profiles[result.player_id].accuracyPointsRaw.push({
          level: result.level,
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
      .filter((r) => r.player_id && !!profiles[r.player_id])
      .map((r) => {
        if (!r.player_id || !r.level) return null;

        const profile = profilesInterpolated[r.player_id];
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

        weight *= Math.min(1, Math.max(0.1, (8 - Math.abs(difficulty - r.level)) / 8));

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
    sums.diffSum += _.toNumber(chartResults[0].level) * 2;
    sums.weightSum += 2;
    return {
      level: chartResults[0].level,
      name: chartResults[0].track_short_name,
      difficulty: sums.diffSum / sums.weightSum,
      affectedBy: resultsData
        .filter((res) => res)
        .map((res) => {
          return {
            player: res?.r.nickname,
            difficultyGuess: res?.difficulty,
            weight: res?.weight,
          };
        }),
    };
  }, resultsByChart);
  return charts;
};
