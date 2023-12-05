import { parse } from 'exif-date';
import * as ExifReader from 'exifreader';

export const getDateFromFile = async (file: string | File) => {
  const data = await ExifReader.load(file);
  const dateString =
    data.DateTimeOriginal?.description ||
    data.DateTimeDigitized?.description ||
    data.DateTime?.description;

  if (typeof dateString !== 'string') return null;

  return parse(dateString);
};
