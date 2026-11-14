import contentDisposition from 'content-disposition';
import type { Response, Request, NextFunction } from 'express';
import { getScreenshot } from 'services/results/getScreenshot';
import { getFirstFrameFromMp4 } from 'utils/mp4';

export const screenshotController = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const resultId = parseInt(request.params.resultId, 10);
    const { filePath, fileName, isVideo } = await getScreenshot(resultId);

    // Inline, so the browser still shows the image, but saving it uses this name
    const disposition = contentDisposition(fileName, { type: 'inline' });

    if (isVideo) {
      getFirstFrameFromMp4(filePath, (buffer, err) => {
        if (err) {
          next(err);
        } else if (!buffer) {
          next(new Error('Extracting image from mp4 failed, empty buffer'));
        } else {
          response.writeHead(200, {
            'Content-Type': 'image/jpeg',
            'Content-Length': buffer.length,
            'Content-Disposition': disposition,
          });
          response.end(buffer);
        }
      });
    } else {
      response.sendFile(
        filePath,
        { headers: { 'Content-Disposition': disposition } },
        (error) => error && next(error)
      );
    }
  } catch (error) {
    next(error);
  }
};
