import { db } from 'db';
import type { Response, Request, NextFunction } from 'express';
import _ from 'lodash/fp';
import {
  getInterpolatedDifficultyPerChartInstance,
  updateChartsDifficulty,
} from 'services/charts/chartDifficultyInterpolation';

export const difficultyInterpolationController = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const interpolatedDiffs = await getInterpolatedDifficultyPerChartInstance();

    const chartLevels = (
      await db
        .selectFrom('chart_instances')
        .leftJoin('tracks', 'chart_instances.track', 'tracks.id')
        .select([
          'chart_instances.id as chart_instance_id',
          'chart_instances.shared_chart as shared_chart_id',
          'chart_instances.level',
          'chart_instances.mix',
          'tracks.full_name',
          'chart_instances.label',
        ])
        .where('mix', '>=', 25)
        .where('chart_instances.level', 'is not', null)
        .execute()
    )
      .map((chart) => {
        return {
          ...chart,
          interpolated: interpolatedDiffs[chart.chart_instance_id]?.difficulty,
        };
      })
      .filter((ch) => ch.interpolated && ch.level)
      .sort((a, b) => {
        return Math.abs(b.level! - b.interpolated) - Math.abs(a.level! - a.interpolated);
      });

    const bySharedChart = _.flow(
      _.groupBy((ch: (typeof chartLevels)[number]) => ch.shared_chart_id),
      (z) => _.toPairs(z),
      _.map(([, charts]) => ({
        charts,
        amplitude: Math.max(
          Math.max(...charts.map((c) => c.interpolated)) -
            Math.min(...charts.map((c) => c.interpolated)),
          Math.max(...charts.map((c) => (c.level ? Math.abs(c.level - c.interpolated) : 0)))
        ),
      })),
      _.orderBy('amplitude', 'desc')
    )(chartLevels);

    response.json(bySharedChart);
  } catch (error) {
    next(error);
  }
};

export const updateChartsDifficultyController = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    await updateChartsDifficulty();
    response.json({ success: true });
  } catch (error) {
    next(error);
  }
};
