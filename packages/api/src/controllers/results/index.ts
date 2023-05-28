import _ from 'lodash/fp';
import type { Response, Request, NextFunction } from 'express';

import { knex } from 'db';

import { error } from 'utils';

import { Result } from 'models/Result';
import { ResultHighestScoreNoRank } from 'models/ResultHighestScoreNoRank';
import { ResultHighestScoreRank } from 'models/ResultHighestScoreRank';
import { ResultBestGrade } from 'models/ResultBestGrade';
import { Player } from 'models/Player';

import { SharedChart } from 'models/SharedChart';
import { resultAddedEffect } from 'processors/resultAddedEffect';

const debug = require('debug')('backend-ts:controller:results');

type ResultApi = {
  id: number;
  shared_chart_id: number;
  shared_chart: {
    max_pp: number;
    track: {
      short_name: string;
      duration: string;
    };
  };
  chart_instance: {
    label: string;
    interpolated_difficulty: number;
    level: number;
  };
  player_id: number;
  player: {
    nickname: string;
  };
  score_xx: number;
  score_increase: number;
  exact_gain_date: 0 | 1;
  rank_mode: 0 | 1;
  mods_list: string;
  misses: number;
  bads: number;
  goods: number;
  greats: number;
  perfects: number;
  calories: number;
  grade: string;
  max_combo: number;
  gained: Date;
  recognition_notes: string;
  pp: number;
};

const getResultJson = (res: ResultApi) => {
  return {
    id: res.id,
    playerId: res.player_id,
    playerName: res.player.nickname,
    isExactDate: res.exact_gain_date === 1,
    isRank: res.rank_mode === 1,
    isMyBest: res.recognition_notes === 'personal_best',
    isMachineBest: res.recognition_notes === 'machine_best',
    score: res.score_xx,
    scoreIncrease: res.score_increase,
    mods: res.mods_list,
    misses: res.misses,
    bads: res.bads,
    goods: res.goods,
    greats: res.greats,
    perfects: res.perfects,
    grade: res.grade,
    calories: res.calories,
    gained: res.gained,
    combo: res.max_combo,
    pp: res.pp,
  };
};

const getDefaultChart = (res: ResultApi) => {
  return {
    id: res.shared_chart_id,
    song: res.shared_chart.track.short_name,
    label: res.chart_instance.label,
    difficulty: res.chart_instance.interpolated_difficulty,
    level: res.chart_instance.level,
    duration: res.shared_chart.track.duration,
    maxPp: res.shared_chart.max_pp,
    results: [] as ResultJson[],
    rankResults: [] as ResultJson[],
  };
};

type ResultJson = ReturnType<typeof getResultJson>;
type ChartInfo = ReturnType<typeof getDefaultChart>;

export const getGroupedResults = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const getQuery = () =>
      knex
        .query(SharedChart)
        .leftOuterJoin('rbg', ResultBestGrade, 'shared_chart_id', '=', 'id')
        .leftOuterJoinTableOnFunction('rnr', ResultHighestScoreNoRank, (join) =>
          join.on('shared_chart_id', '=', 'id').andOn('player_id', '=', 'rbg.player_id')
        )
        .leftOuterJoinTableOnFunction('rr', ResultHighestScoreRank, (join) =>
          join.on('shared_chart_id', '=', 'id').andOn('player_id', '=', 'rbg.player_id')
        )
        .innerJoin('player', Player, 'id', '=', 'rbg.player_id')
        .leftOuterJoinTableOnFunction('result', Result, (join) =>
          join.on('id', '=', 'rnr.result_id')
        )
        .leftOuterJoinTableOnFunction('rankResult', Result, (join) =>
          join.on('id', '=', 'rr.result_id')
        )
        .leftOuterJoinTableOnFunction('bestGradeResult', Result, (join) =>
          join
            .on('id', '=', 'rbg.result_id')
            .andOn('grade', '!=', 'result.grade')
            .andOn('grade', '!=', 'rankResult.grade')
        )
        .select(
          'id',
          'player.id',
          'player.nickname',
          ..._.flatMap(
            (field) =>
              [`result.${field}`, `rankResult.${field}`, `bestGradeResult.${field}`] as const,
            [
              'id',
              'misses',
              'bads',
              'goods',
              'greats',
              'perfects',
              'score_xx',
              'score_increase',
              'grade',
              'gained',
              'exact_gain_date',
              'rank_mode',
              'mods_list',
              'calories',
              'max_combo',
              'pp',
              // 'recognition_notes',
            ] as const
          )
        )
        .where('player.hidden', 0)
        .groupBy('id')
        .groupBy('player.id')
        .orderBy('id', 'desc')
        .orderBy('result.score_xx', 'desc');

    const results = await getQuery().getMany();

    response.json(
      results.map((res: Partial<(typeof results)[number]>) => {
        if (!res.result?.id) {
          delete res.result;
        }
        if (!res.rankResult?.id) {
          delete res.rankResult;
        }
        if (!res.bestGradeResult?.id) {
          delete res.bestGradeResult;
        }
        return res;
      })
    );
  } catch (e: any) {
    debug('ERROR:', e.message);
    next(error(500, 'Database Error: ' + e.message));
  }
};

export const getTopResults = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const getResultsQuery = () =>
      knex
        .query(Result)
        .select(
          'id',
          'player_id',
          'shared_chart_id',
          'player.nickname',
          'chart_instance.label',
          'chart_instance.interpolated_difficulty',
          'chart_instance.level',
          'shared_chart.max_pp',
          'shared_chart.track.short_name',
          'shared_chart.track.duration',
          'misses',
          'bads',
          'goods',
          'greats',
          'perfects',
          'score_xx',
          'score_increase',
          'grade',
          'gained',
          'exact_gain_date',
          'rank_mode',
          'mods_list',
          'calories',
          'max_combo',
          'recognition_notes',
          'pp'
        )
        .innerJoinColumn('player')
        .innerJoinColumn('chart_instance')
        .innerJoinColumn('shared_chart')
        .innerJoinColumn('shared_chart.track')
        .where('player.hidden', 0)
        .andWhere('is_hidden', 0)
        .orderBy('shared_chart_id', 'desc')
        .orderBy('score_xx', 'desc');
    const resultsNoRank = await getResultsQuery()
      .innerJoin('best_score_no_rank', ResultHighestScoreNoRank, 'result_id', '=', 'id')
      .getMany();
    const resultsRank = await getResultsQuery()
      .innerJoin('best_score_rank', ResultHighestScoreRank, 'result_id', '=', 'id')
      .getMany();

    const charts: Record<number, ChartInfo> = {};

    for (const res of resultsNoRank) {
      if (!charts[res.shared_chart_id]) {
        charts[res.shared_chart_id] = getDefaultChart(res);
      }
      charts[res.shared_chart_id].results.push(getResultJson(res));
    }
    for (const res of resultsRank) {
      if (!charts[res.shared_chart_id]) {
        charts[res.shared_chart_id] = getDefaultChart(res);
      }
      charts[res.shared_chart_id].rankResults.push(getResultJson(res));
    }

    response.json(_.values(charts));
  } catch (e: any) {
    debug('ERROR:', e.message);
    next(error(500, 'Database Error: ' + e.message));
  }
};

export const onResultAdded = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const resultId = _.toNumber(request.params.resultId);

    try {
      await resultAddedEffect(resultId);
      response.sendStatus(200);
    } catch (error: unknown) {
      next(error instanceof Error ? error : new Error('Unknown error'));
    }
  } catch (e: any) {
    debug('ERROR:', e.message);
    next(error(500, 'Database Error: ' + e.message));
  }
};
