import * as ExifReader from 'exifreader';
import { parse } from 'exif-date';

export const getDateFromFile = async (file) => {
  const data = await ExifReader.load(file);
  const dateString =
    data.DateTimeOriginal?.description ||
    data.DateTimeDigitized?.description ||
    data.DateTime?.description;

  if (typeof dateString !== 'string') return null;

  return parse(dateString);
};
