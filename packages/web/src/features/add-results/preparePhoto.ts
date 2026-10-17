import { compressCanvas, getDateFromFile } from './imageUtils';

// The readers do best with 2048px on the long side (docs/photo-results/PLAN.md)
const READER_IMAGE_SIZE = 2048;

/** SHA-256 of the file as selected, in hex: the same file is never read twice */
export const hashFile = async (file: File): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export interface PreparedPhoto {
  // A 2048px JPEG for the readers, and the copy stored with the result, as data URLs
  image: string;
  screenshot: string;
  date: Date;
  isExactDate: boolean;
}

export const preparePhoto = async (file: File): Promise<PreparedPhoto> => {
  // The date is in the original file's EXIF, which resizing drops
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
