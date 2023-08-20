import path from 'path';

export const replacePatterns = <T extends object>(str: string, data: T): string => {
  let res = str;
  for (const [key, value] of Object.entries(data)) {
    res = res.replace(new RegExp(`{${key}}`, 'g'), value?.toString() ?? '');
  }
  return res;
};

export interface ScreenshotBasePathData {
  playerId: number;
  nickname: string;
  email: string | null;
}

export const getScreenshotBasePath = (pattern: string, data: ScreenshotBasePathData): string => {
  return path.normalize(replacePatterns(pattern, data));
};

export interface ScreenshotFileData extends ScreenshotBasePathData {
  dateAdded: string;
  dateTimeAdded: string;
  date: string;
  dateTime: string;
  sharedChartId: number;
  token: string;
}

export const getScreenshotFilePath = (pattern: string, data: ScreenshotFileData): string => {
  return path.normalize(replacePatterns(pattern, data));
};
