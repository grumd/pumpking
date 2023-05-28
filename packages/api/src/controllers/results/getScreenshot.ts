import type { Response } from 'express';

import path from 'path';

import { knex } from 'db';

import { Result } from 'models/Result';

import { StatusError } from 'utils/errors';
import { getScreenshotBasePath } from 'utils/pathPatterns';

export const getScreenshotPath = async (resultId: number) => {
  if (!process.env.SCREENSHOT_BASE_FOLDER) {
    throw new Error('SCREENSHOT_BASE_FOLDER env variable is not set');
  }

  const result = await knex
    .query(Result)
    .select('screen_file', 'player.nickname', 'player.id', 'player.email')
    .innerJoinColumn('player')
    .where('id', resultId)
    .getFirstOrNull();

  if (!result) {
    throw new StatusError(404, 'Result not found');
  } else if (!result.screen_file) {
    throw new StatusError(404, 'Screenshot not found');
  }

  const filePath = path.join(
    getScreenshotBasePath(process.env.SCREENSHOT_BASE_FOLDER, {
      playerId: result.player.id,
      nickname: result.player.nickname,
      email: result.player.email,
    }),
    result.screen_file
  );

  return filePath;
};
