import { db } from '@pumpking/core/db';
import path from 'path';
import { getUploadPath } from 'services/uploads/uploadPath';
import { StatusError } from 'utils/errors';

export type AdminFileSource = 'results' | 'purgatory';

// `screen`: the screenshot or video an agent uploaded; `scan`: its recognition JSON,
// which piu-spy uploads next to it under the same name
export type AdminFileKind = 'screen' | 'scan';

export const getAdminFilePath = async (
  source: AdminFileSource,
  id: number,
  kind: AdminFileKind
) => {
  const row = await db
    .selectFrom(source)
    .select(['screen_file', 'agent'])
    .where('id', '=', id)
    .executeTakeFirst();

  if (!row) {
    throw new StatusError(404, `Not found: ${source} id ${id}`);
  } else if (!row.screen_file) {
    throw new StatusError(404, 'No screen file recorded');
  }

  const { dir, name } = path.parse(row.screen_file);
  const relativePath = kind === 'scan' ? path.join(dir, `${name}.json`) : row.screen_file;

  return getUploadPath(row.agent, relativePath);
};
