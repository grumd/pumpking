import _ from 'lodash/fp';
import type { Response, Request, NextFunction } from 'express';

import { knex } from 'db';

import { error } from 'utils';

import { Result } from 'models/Result';
import { Player } from 'models/Player';
import { ChartInstance } from 'models/ChartInstance';

import { calculateResultsPp } from 'processors/resultsPp';
import { getSinglePlayerTotalPp } from 'processors/playersPp';
import chartDifficultyInterpolation from 'processors/chartDifficultyInterpolation';

import { mix } from 'constants/currentMix';

const debug = require('debug')('backend-ts:controller:admin');

export const recalculateAllResultsPp = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  const transaction = await knex.beginTransaction();

  try {
    // Calculate pp of all results
    const resultsPpMap = await calculateResultsPp(null, transaction);
    debug(`Calculated pp for all results`);
    const entries = Array.from(resultsPpMap.entries());
    const resultIds = entries.map(([resultId]) => resultId);
    const playerIds = await knex
      .query(Result)
      .select('player_id')
      .distinct()
      .whereIn('id', resultIds)
      .getMany();

    // Updating pp values for all results in this shared chart
    await Promise.all(
      entries.map(([resultId, pp]) => {
        // debug(`Updating result ${resultId} with pp ${pp}`);
        return knex.query(Result).transacting(transaction).updateItemByPrimaryKey(resultId, { pp });
      })
    );
    debug(`Updated all results pps in the database`);

    // Updating pp values for all players whose results were updated
    await Promise.all(
      playerIds.map(async (value) => {
        const playerId = value.player_id;
        const totalPp = await getSinglePlayerTotalPp(playerId, transaction);
        // debug(`Updating player ${playerId} with total pp ${totalPp}`);
        await knex
          .query(Player)
          .transacting(transaction)
          .updateItemByPrimaryKey(playerId, { pp: totalPp });
      })
    );
    debug(`Updated all players' total pp in the database`);

    await transaction.commit();

    response.sendStatus(200);
  } catch (e: any) {
    await transaction.rollback();
    debug('ERROR:', e.message);
    next(error(500, 'Database Error: ' + e.message));
  }
};

export const refreshSharedChartInterpolatedDifficulty = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const chartsDifficulty = _.toPairs(await chartDifficultyInterpolation());

    debug(`Updating difficulty for ${chartsDifficulty.length} charts`);

    const queries = _.map(([sharedChartId, { difficulty }]) => {
      return knex
        .query(ChartInstance)
        .where('shared_chart_id', _.toNumber(sharedChartId))
        .where('mix', mix)
        .updateItem({ interpolated_difficulty: difficulty });
    }, chartsDifficulty);

    return Promise.all(queries).then(() => {
      debug('Finished updating charts interpolated difficulty');
      response.sendStatus(200);
    });
  } catch (e: any) {
    debug('ERROR:', e.message);
    next(error(500, 'Database Error: ' + e.message));
  }
};

export const getInterpolationInfoForSharedChart = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  const sharedChartId = _.toNumber(request.params.sharedChartId);

  try {
    const chartsDifficulty = (await chartDifficultyInterpolation())[sharedChartId];
    response.json(chartsDifficulty);
  } catch (e: any) {
    debug('ERROR:', e.message);
    next(error(500, 'Database Error: ' + e.message));
  }
};
