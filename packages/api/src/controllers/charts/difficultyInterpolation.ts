import { db } from 'db';
import type { Response, Request, NextFunction } from 'express';
import _ from 'lodash/fp';
import { updateChartsDifficulty } from 'services/charts/chartDifficultyInterpolation';

/**
 * Debug view: how far each shared chart's interpolated difficulty sits from the
 * official levels of its instances, biggest drift first.
 */
export const difficultyInterpolationController = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const charts = await db
      .selectFrom('shared_charts')
      .innerJoin('tracks', 'tracks.id', 'shared_charts.track')
      .select([
        'shared_charts.id as shared_chart_id',
        'shared_charts.interpolated_difficulty as interpolated',
        'tracks.full_name',
      ])
      .where('shared_charts.interpolated_difficulty', 'is not', null)
      .execute();

    const instances = await db
      .selectFrom('chart_instances')
      .select([
        'shared_chart as shared_chart_id',
        'id as chart_instance_id',
        'level',
        'mix',
        'label',
      ])
      .where('mix', '>=', 25)
      .where('level', 'is not', null)
      .execute();

    const instancesByChart = _.groupBy('shared_chart_id', instances);

    response.json(
      charts
        .map((chart) => {
          const chartInstances = instancesByChart[chart.shared_chart_id] ?? [];
          return {
            ...chart,
            charts: chartInstances,
            amplitude: Math.max(
              0,
              ...chartInstances.map((instance) => Math.abs(instance.level! - chart.interpolated!))
            ),
          };
        })
        .filter((chart) => chart.charts.length > 0)
        .sort((a, b) => b.amplitude - a.amplitude)
    );
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
