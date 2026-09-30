import { db } from '@pumpking/core/db';
import { getUploadPath } from 'services/uploads/uploadPath';
import { StatusError } from 'utils/errors';

export const getScreenshotPath = async (resultId: number) => {
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

  return getUploadPath(result.agent, result.screen_file);
};
