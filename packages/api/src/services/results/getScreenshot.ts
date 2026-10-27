import { db } from '@pumpking/database/db';
import path from 'path';
import { getUploadPath } from 'services/uploads/uploadPath';
import { StatusError } from 'utils/errors';

// Characters that Windows, macOS or Linux don't allow in file names
const unsafeFileNameChars = /[<>:"/\\|?*\u0000-\u001f\u007f]/g;

/**
 * A file name for saving the screenshot, like "grumd - Repentance D20.jpg".
 * `extension` includes the dot
 */
export const getScreenshotFileName = (
  parts: { playerName?: string | null; trackName?: string | null; chartLabel?: string | null },
  extension: string
) => {
  const chart = [parts.trackName, parts.chartLabel].filter(Boolean).join(' ');
  const name = [parts.playerName, chart]
    .filter(Boolean)
    .join(' - ')
    .replace(unsafeFileNameChars, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\.+$/, '');
  return (name || 'screenshot') + extension;
};

export const getScreenshot = async (resultId: number) => {
  const result = await db
    .selectFrom('results')
    .leftJoin('players', 'players.id', 'results.player_id')
    .leftJoin('chart_instances', 'chart_instances.id', 'results.chart_instance')
    .leftJoin('tracks', 'tracks.id', 'chart_instances.track')
    .select([
      'results.screen_file',
      'results.agent',
      'players.nickname',
      'tracks.full_name',
      'chart_instances.label',
    ])
    .where('results.id', '=', resultId)
    .executeTakeFirst();

  if (!result) {
    throw new StatusError(404, 'Result not found');
  } else if (!result.screen_file) {
    throw new StatusError(404, 'Screenshot not recorded');
  }

  const filePath = getUploadPath(result.agent, result.screen_file);
  // Videos are sent as their first frame, a jpg
  const isVideo = filePath.endsWith('.mp4');
  const fileName = getScreenshotFileName(
    { playerName: result.nickname, trackName: result.full_name, chartLabel: result.label },
    isVideo ? '.jpg' : path.extname(filePath)
  );

  return { filePath, fileName, isVideo };
};
