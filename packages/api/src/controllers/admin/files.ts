import type { Response, Request, NextFunction } from 'express';
import path from 'path';
import { type AdminFileKind, type AdminFileSource, getAdminFilePath } from 'services/admin/files';

export const adminFileController = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const filePath = await getAdminFilePath(
      request.params.source as AdminFileSource,
      Number(request.params.id),
      request.params.kind as AdminFileKind
    );
    // The web reads the file name from Content-Disposition when saving the file
    response.attachment(path.basename(filePath));
    response.sendFile(filePath, (error) => error && next(error));
  } catch (error) {
    next(error);
  }
};
