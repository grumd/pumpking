import { MIXES } from 'constants/mixes';
import { db } from 'db';
import createDebug from 'debug';
import fs from 'fs';
import path from 'path';
import { resultAddedEffect } from 'services/results/resultAddedEffect';
import { error } from 'utils';
import { prepareForKnexUtc } from 'utils/date';
import {
  getScreenshotBasePath,
  getScreenshotFilePath,
  type ScreenshotFileData,
} from 'utils/pathPatterns';
import { getPhoenixScore } from 'utils/scoring/phoenixScore';

const debug = createDebug('backend-ts:controller:results');

const dateToFileName = (date: Date, opts: { withTime?: boolean } = {}) => {
  if (opts?.withTime) {
    return date.toISOString().slice(0, 19).replace(/:/g, '-').replace(/T/g, '--');
  } else {
    return date.toISOString().slice(0, 10).replace(/:/g, '-');
  }
};

const generateToken = () => {
  let token = '';
  for (let i = 0; i < 10; i++) {
    const rnd = Math.floor(Math.random() * 62);
    token += String.fromCharCode(rnd + (rnd < 10 ? 48 : rnd < 36 ? 55 : 61));
  }
  return token;
};

interface ManualResult {
  screenshotTempPath: string;
  playerId: number;
  grade: string;
  mix: keyof typeof MIXES;
  mod: 'VJ' | 'HJ' | '';
  score: number;
  perfect: number;
  great: number;
  good: number;
  bad: number;
  miss: number;
  combo: number;
  date: Date;
  isExactDate: boolean;
  sharedChartId: number;
  pass: boolean;
}

export const addResult = async (userId: number, result: ManualResult) => {
  if (userId !== result.playerId) {
    throw error(403, 'Forbidden: You can only add results for yourself');
  }

  const player = await db
    .selectFrom('players')
    .where('id', '=', result.playerId)
    .selectAll()
    .executeTakeFirst();

  if (!player) {
    throw error(400, `Bad Request: Player ${result.playerId} does not exist`);
  }
  if (player.discard_results) {
    throw error(400, `Bad Request: Player ${result.playerId}'s results are discarded`);
  }

  const sharedChart = await db
    .selectFrom('shared_charts')
    .innerJoin('tracks', 'tracks.id', 'shared_charts.track')
    .where('shared_charts.id', '=', result.sharedChartId)
    .select(['tracks.duration', 'tracks.short_name'])
    .executeTakeFirst();

  const chartInstance = await db
    .selectFrom('chart_instances')
    .where('shared_chart', '=', result.sharedChartId)
    .where('mix', '=', MIXES[result.mix])
    .select([
      'id',
      'level',
      'label',
      'max_possible_score_norank',
      'max_total_steps',
      'min_total_steps',
    ])
    .executeTakeFirst();

  if (!sharedChart || !chartInstance) {
    throw error(400, `Bad Request: Chart not found`);
  }

  if (result.mod === 'VJ') {
    if (
      sharedChart.duration !== 'Standard' ||
      !chartInstance.level ||
      chartInstance.level < 13 ||
      chartInstance.label.startsWith('SP') ||
      chartInstance.label.startsWith('DP') ||
      chartInstance.label.startsWith('COOP')
    ) {
      throw error(400, `Bad Request: Rank Mode can not be used on this chart`);
    }
  }

  const scoreError = getScoreError(result, chartInstance);
  if (scoreError) {
    throw error(400, `Bad Request: ${scoreError}`);
  }

  // Score is valid, add it to the database
  const token = generateToken();

  const screenshotPath = saveScreenshot(result.screenshotTempPath, {
    ...result,
    ...player,
    token,
    dateAdded: dateToFileName(new Date()),
    dateTimeAdded: dateToFileName(new Date(), { withTime: true }),
    date: dateToFileName(result.date),
    dateTime: dateToFileName(result.date, { withTime: true }),
  });

  const maxScoreResult = await db
    .selectFrom('results')
    .select(({ fn }) => [fn.max('score').as('maxScore')])
    .where('shared_chart', '=', result.sharedChartId)
    .where('player_id', '=', result.playerId)
    .executeTakeFirst();

  const insertResult = await db
    .insertInto('results')
    .values({
      token,
      screen_file: screenshotPath,
      recognition_notes: 'manual',
      added: prepareForKnexUtc(new Date()),
      agent: -1,
      track_name: sharedChart.short_name || '',
      mix_name: result.mix,
      mix: MIXES[result.mix],
      chart_label: chartInstance.label,
      shared_chart: result.sharedChartId,
      chart_instance: chartInstance.id,
      player_name: player.nickname,
      recognized_player_id: result.playerId,
      gained: result.date,
      exact_gain_date: result.isExactDate ? 1 : 0,
      rank_mode: result.mod === 'VJ' ? 1 : 0,
      mods_list: result.mod,
      score: result.score,
      score_xx: result.score,
      misses: result.miss,
      bads: result.bad,
      goods: result.good,
      greats: result.great,
      perfects: result.perfect,
      grade:
        // Add a + to the grade letter for XX and earlier if not already provided (A => A+)
        MIXES[result.mix] < MIXES.Phoenix &&
        result.pass &&
        ['A', 'B', 'C', 'D', 'F'].includes(result.grade)
          ? result.grade + '+'
          : result.grade,
      max_combo: result.combo,
      is_new_best_score: !maxScoreResult || result.score > (maxScoreResult.maxScore ?? 0) ? 1 : 0,
      is_manual_input: 1,
      is_pass: result.pass ? 1 : 0,
    })
    .executeTakeFirst();

  if (!insertResult) {
    throw error(500, 'Failed to insert result in the database');
  }

  debug('Manually added a new result id ', insertResult.insertId);

  await resultAddedEffect(Number(insertResult.insertId));
};

const getScoreError = (
  result: ManualResult,
  chart: {
    max_possible_score_norank: number | null;
    max_total_steps: number | null;
    min_total_steps: number | null;
  }
): string | null => {
  const { score, perfect, great, good, bad, miss, combo } = result;

  // XX AND EARLIER CHECKS
  if (MIXES[result.mix] < MIXES.Phoenix) {
    // Score must be multiples of 100
    if (score < 0 || score % 100 !== 0) {
      return 'Invalid score';
    }

    // Rough check for min score
    const minScore = 1000 * perfect + 500 * great + 100 * good - 200 * bad - 500 * miss;
    if (score < minScore) {
      return 'Score is lower than minimum possible';
    }

    // Rough estimate of a max score to catch mistakes in the input
    if (chart.max_possible_score_norank) {
      const maxScore = 1.5 * chart.max_possible_score_norank * (result.mod === 'VJ' ? 1.2 : 1);
      if (score > maxScore) {
        return 'Score is higher than maximum possible';
      }
    }

    // Rough SS check
    if (result.grade.startsWith('SS') && combo !== perfect + great) {
      return 'Combo is not equal to perfect + great with SS or SSS';
    }
  }

  // ONLY PHOENIX AND LATER CHECKS
  if (MIXES[result.mix] >= MIXES.Phoenix) {
    const expectedScore = getPhoenixScore({ perfect, great, good, bad, miss, combo });
    if (score !== expectedScore) {
      return `Score ${score} doesn't match expected score ${expectedScore} (calculated from result stats)`;
    }
  }

  // OTHER CHECKS FOR ALL MIXES

  const totalSteps = perfect + great + good + bad + miss;
  if (chart.max_total_steps && totalSteps > chart.max_total_steps) {
    return 'Total steps is higher than maximum possible';
  }
  if (chart.min_total_steps && totalSteps < chart.min_total_steps) {
    return 'Total steps is lower than minimum possible';
  }

  if (combo > 0 && perfect > 0 && great > 0 && combo > perfect + great) {
    return 'Combo is higher than perfect + great';
  }

  return null;
};

const saveScreenshot = (screenshotTempPath: string, data: ScreenshotFileData): string => {
  if (!process.env.SCREENSHOT_BASE_FOLDER) {
    throw new Error('SCREENSHOT_BASE_FOLDER env variable is not set');
  }
  if (!process.env.SCREENSHOT_FILE_PATH_DB) {
    throw new Error('SCREENSHOT_FILE_PATH_DB env variable is not set');
  }

  const fileRelativePath = getScreenshotBasePath(process.env.SCREENSHOT_FILE_PATH_DB, data);
  const baseDirectory = getScreenshotFilePath(process.env.SCREENSHOT_BASE_FOLDER, data);
  const fullPath = path.join(baseDirectory, fileRelativePath);

  if (process.env.NODE_ENV !== 'test') {
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.copyFileSync(screenshotTempPath, fullPath);
  }

  return fileRelativePath;
};
