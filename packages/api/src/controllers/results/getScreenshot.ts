import path from 'path';
import fs from 'fs';

import { db } from 'db';

import { StatusError } from 'utils/errors';

export const getScreenshotPath = async (resultId: number) => {
  if (!process.env.SCREENSHOT_BASE_FOLDER || !process.env.SCREENSHOT_AGENT_BASE_FOLDER) {
    throw new Error(
      'SCREENSHOT_BASE_FOLDER or SCREENSHOT_AGENT_BASE_FOLDER env variable is not set'
    );
  }

  const result = await db
    .selectFrom('results')
    .select(['screen_file', 'agent'])
    .where('id', '=', resultId)
    .executeTakeFirst();

  if (!result) {
    throw new StatusError(404, 'Result not found');
  } else if (!result.screen_file) {
    throw new StatusError(404, 'Screenshot not recorded');
  }

  const basePath =
    result.agent < 0
      ? process.env.SCREENSHOT_BASE_FOLDER
      : process.env.SCREENSHOT_AGENT_BASE_FOLDER;

  const filePath = path.join(basePath, result.screen_file);

  if (!fs.existsSync(filePath) || !fs.lstatSync(filePath).isFile()) {
    throw new StatusError(404, 'Screenshot file not found', { filePath });
  }

  return filePath;
};
