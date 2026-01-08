import type { IArea } from '@bmunozg/react-image-area';
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
    maxWidthOrHeight: 1200,
    maxSizeMB: 0.1,
    initialQuality: 0.8,
  });
  return imageCompression.getDataUrlFromFile(compressed);
};

/**
 * Calculates how "white" a pixel is (0-255).
 * White pixels have high values in all channels and similar R, G, B values.
 * This prioritizes white text over bright colorful backgrounds.
 */
const getWhiteness = (r: number, g: number, b: number): number => {
  // Minimum channel value (a white pixel has all channels high)
  const minChannel = Math.min(r, g, b);

  // Color spread (white has low spread, colorful has high spread)
  const maxChannel = Math.max(r, g, b);
  const spread = maxChannel - minChannel;

  return Math.min(255, Math.max(0, Math.round(minChannel ** 3 / 240 ** 2) - spread * 1));
};

/**
 * Shrinks a selection area to fit the white text content within it.
 * Finds the bounding box of the top X% whitest pixels (prioritizes pixels
 * that are bright AND have low color saturation, i.e., close to white).
 * Synchronous - works directly with ImageData.
 * @param imageData - The source image pixel data
 * @param naturalSize - The natural size of the square image
 * @param area - The selected area in display coordinates
 * @param displayedSize - The size of the image as displayed on screen
 * @param brightnessPercentile - What percentile of whiteness to consider as "white" (0-100, default 95)
 */
export const shrinkAreaToBrightness = (
  imageData: ImageData,
  naturalSize: number,
  area: IArea,
  displayedSize: number,
  brightnessPercentile = 95
): IArea => {
  const sourcePixels = imageData.data;
  const sourceWidth = imageData.width;

  // Scale coordinates from displayed size to natural size
  const scale = naturalSize / displayedSize;

  const scaledX = Math.round(area.x * scale);
  const scaledY = Math.round(area.y * scale);
  const scaledWidth = Math.round(area.width * scale);
  const scaledHeight = Math.round(area.height * scale);

  // Calculate whiteness for pixels in the selected area
  const whitenessMap: number[] = [];
  for (let y = 0; y < scaledHeight; y++) {
    for (let x = 0; x < scaledWidth; x++) {
      const sourceX = scaledX + x;
      const sourceY = scaledY + y;
      const i = (sourceY * sourceWidth + sourceX) * 4;
      const whiteness = getWhiteness(sourcePixels[i], sourcePixels[i + 1], sourcePixels[i + 2]);
      whitenessMap.push(whiteness);
    }
  }

  // Find the whiteness threshold (top X percentile)
  const sortedWhiteness = [...whitenessMap].sort((a, b) => b - a);
  const thresholdIndex = Math.floor((sortedWhiteness.length * (100 - brightnessPercentile)) / 100);
  const whitenessThreshold = sortedWhiteness[thresholdIndex] || 200;

  // Find bounding box of white pixels
  let minX = scaledWidth;
  let maxX = 0;
  let minY = scaledHeight;
  let maxY = 0;

  for (let y = 0; y < scaledHeight; y++) {
    for (let x = 0; x < scaledWidth; x++) {
      const idx = y * scaledWidth + x;
      if (whitenessMap[idx] >= whitenessThreshold) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  // If no white pixels found, return original area
  if (minX >= maxX || minY >= maxY) {
    return area;
  }

  // Add small padding
  const paddingX = Math.max(4, (maxX - minX) * 0.025);
  const paddingY = Math.max(3, (maxY - minY) * 0.02);

  minX = Math.max(0, minX - paddingX);
  maxX = Math.min(scaledWidth, maxX + paddingX);
  minY = Math.max(0, minY - paddingY);
  maxY = Math.min(scaledHeight, maxY + paddingY);

  // Convert back to display coordinates
  const newArea: IArea = {
    ...area,
    x: area.x + minX / scale,
    y: area.y + minY / scale,
    width: (maxX - minX) / scale,
    height: (maxY - minY) / scale,
  };

  return newArea;
};

export const applyProcessing = (
  imageData: ImageData,
  originalImageData: ImageData,
  left: number,
  top: number,
  width: number,
  height: number
) => {
  const sourcePixels = originalImageData.data;

  for (let i = 0; i < sourcePixels.length; i++) {
    imageData.data[i] = sourcePixels[i];
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sourceX = left + x;
      const sourceY = top + y;
      const i = (sourceY * imageData.width + sourceX) * 4;
      const whiteness = getWhiteness(sourcePixels[i], sourcePixels[i + 1], sourcePixels[i + 2]);
      imageData.data[i] = 255 - whiteness;
      imageData.data[i + 1] = 255 - whiteness;
      imageData.data[i + 2] = 255 - whiteness;
      imageData.data[i + 3] = 255;
    }
  }
};

/**
 * Crops a selected area from ImageData and applies whiteness processing.
 * Returns processed ImageData ready for OCR.
 * @param imageData - The source image pixel data
 * @param naturalSize - The natural size of the square image
 * @param area - The selected area in display coordinates
 * @param displayedSize - The size of the square image as displayed on screen
 */
export const prepareImageForRecognition = (
  imageData: ImageData,
  naturalSize: number,
  area: IArea,
  displayedSize: number
): ImageData => {
  const sourcePixels = imageData.data;
  const sourceWidth = imageData.width;

  // Scale coordinates from displayed size to natural size
  const scale = naturalSize / displayedSize;

  const scaledX = Math.round(area.x * scale);
  const scaledY = Math.round(area.y * scale);
  const scaledWidth = Math.round(area.width * scale);
  const scaledHeight = Math.round(area.height * scale);

  // Create new ImageData for the cropped region
  const croppedImageData = new ImageData(scaledWidth, scaledHeight);
  const destPixels = croppedImageData.data;

  // Copy pixels from source to destination with whiteness processing
  for (let y = 0; y < scaledHeight; y++) {
    for (let x = 0; x < scaledWidth; x++) {
      const sourceX = scaledX + x;
      const sourceY = scaledY + y;
      const srcIdx = (sourceY * sourceWidth + sourceX) * 4;
      const destIdx = (y * scaledWidth + x) * 4;
      destPixels[destIdx] = sourcePixels[srcIdx];
      destPixels[destIdx + 1] = sourcePixels[srcIdx + 1];
      destPixels[destIdx + 2] = sourcePixels[srcIdx + 2];
      destPixels[destIdx + 3] = sourcePixels[srcIdx + 3];
    }
  }

  applyProcessing(croppedImageData, croppedImageData, 0, 0, scaledWidth, scaledHeight);

  return croppedImageData;
};
