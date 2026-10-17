import imageCompression from 'browser-image-compression';
import { parse } from 'exif-date';
import * as ExifReader from 'exifreader';

/**
 * Creates a canvas element from ImageData (cheap pixel copy, no decoding)
 */
export const imageDataToCanvas = (imageData: ImageData): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.putImageData(imageData, 0, 0);
  }
  return canvas;
};

export const getDateFromFile = async (file: string | File) => {
  const data = await ExifReader.load(file);
  const dateString =
    data.DateTimeOriginal?.description ||
    data.DateTimeDigitized?.description ||
    data.DateTime?.description;

  if (typeof dateString !== 'string') return null;

  return parse(dateString);
};

export const compressImageData = async (imageData: ImageData): Promise<string> => {
  const canvas = imageDataToCanvas(imageData);
  const file = await imageCompression.canvasToFile(canvas, 'image/jpeg', 'image.jpg', 0.95);
  const compressed = await imageCompression(file, {
    maxWidthOrHeight: 1000,
    maxSizeMB: 0.1,
    initialQuality: 0.9,
    fileType: 'image/webp',
  });
  return imageCompression.getDataUrlFromFile(compressed);
};
