import { compressCanvas, getDateFromFile } from './imageUtils';

const READER_IMAGE_SIZE = 2048;

export const hashFile = async (file: File): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export interface PreparedPhoto {
  image: string;
  screenshot: string;
  date: Date;
  isExactDate: boolean;
}

export const preparePhoto = async (file: File): Promise<PreparedPhoto> => {
  const exifDate = await getDateFromFile(file).catch(() => null);

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, READER_IMAGE_SIZE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Could not get canvas context');
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const image = canvas.toDataURL('image/jpeg', 0.9);
  const screenshot = await compressCanvas(canvas);
  return { image, screenshot, date: exifDate ?? new Date(), isExactDate: !!exifDate };
};
