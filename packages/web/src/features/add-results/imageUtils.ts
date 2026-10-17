import imageCompression from 'browser-image-compression';
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

export const compressCanvas = async (canvas: HTMLCanvasElement): Promise<string> => {
  const file = await imageCompression.canvasToFile(canvas, 'image/jpeg', 'image.jpg', 0.95);
  const compressed = await imageCompression(file, {
    maxWidthOrHeight: 1000,
    maxSizeMB: 0.1,
    initialQuality: 0.9,
    fileType: 'image/webp',
  });
  return imageCompression.getDataUrlFromFile(compressed);
};
