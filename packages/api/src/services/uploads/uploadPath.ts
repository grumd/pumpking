import fs from 'fs';
import path from 'path';
import { StatusError } from 'utils/errors';

/**
 * The absolute path of an uploaded file, from a `screen_file`-style path relative to
 * the uploads folder. Results added on the web (negative agent ids) are under
 * SCREENSHOT_BASE_FOLDER, results from piu-spy agents under SCREENSHOT_AGENT_BASE_FOLDER.
 * Throws a 404 if the path leads outside that folder or isn't a file
 */
export const getUploadPath = (agent: number, relativePath: string) => {
  if (!process.env.SCREENSHOT_BASE_FOLDER || !process.env.SCREENSHOT_AGENT_BASE_FOLDER) {
    throw new Error(
      'SCREENSHOT_BASE_FOLDER or SCREENSHOT_AGENT_BASE_FOLDER env variable is not set'
    );
  }

  const basePath = path.resolve(
    agent < 0 ? process.env.SCREENSHOT_BASE_FOLDER : process.env.SCREENSHOT_AGENT_BASE_FOLDER
  );
  const filePath = path.resolve(basePath, relativePath);

  if (!filePath.startsWith(basePath + path.sep)) {
    throw new StatusError(404, 'File path is outside the uploads folder', { relativePath });
  }
  if (!fs.existsSync(filePath) || !fs.lstatSync(filePath).isFile()) {
    throw new StatusError(404, 'File not found', { relativePath });
  }

  return filePath;
};
