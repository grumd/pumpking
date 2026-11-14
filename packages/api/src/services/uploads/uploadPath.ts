import fs from 'fs';
import path from 'path';
import { StatusError } from 'utils/errors';

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
