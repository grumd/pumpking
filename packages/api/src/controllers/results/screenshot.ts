import type { Response, Request, NextFunction } from 'express';

import { getScreenshotPath } from 'services/results/getScreenshot';

import { getFirstFrameFromMp4 } from 'utils/mp4';

export const screenshotController = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const resultId = parseInt(request.params.resultId, 10);
    const filePath = await getScreenshotPath(resultId);

    if (filePath.endsWith('.mp4')) {
      getFirstFrameFromMp4(filePath, (buffer, err) => {
        if (err) {
          next(err);
        } else if (!buffer) {
          next(new Error('Extracting image from mp4 failed, empty buffer'));
        } else {
          response.writeHead(200, {
            'Content-Type': 'image/jpg',
            'Content-Length': buffer.length,
          });
          response.end(buffer);
        }
      });
    } else {
      response.sendFile(filePath);
    }
  } catch (error) {
    next(error);
  }
};
