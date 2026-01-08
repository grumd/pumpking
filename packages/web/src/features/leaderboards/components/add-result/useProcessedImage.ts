import { useEffect, useState } from 'react';

import { getDateFromFile } from './imageUtils';

export interface ProcessedImage {
  imageData: ImageData;
  naturalSize: number;
  date: Date | null;
}

interface CropResult {
  imageData: ImageData;
  naturalSize: number;
}

/**
 * Crops an image to a centered square and returns ImageData
 * Uses createImageBitmap for efficient off-main-thread decoding
 */
const cropToSquare = async (file: File): Promise<CropResult> => {
  const bitmap = await createImageBitmap(file);

  const size = Math.min(bitmap.width, bitmap.height);
  const x = (bitmap.width - size) / 2;
  const y = (bitmap.height - size) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Could not get canvas context');
  }

  ctx.drawImage(bitmap, x, y, size, size, 0, 0, size, size);
  bitmap.close();

  const imageData = ctx.getImageData(0, 0, size, size);
  return { imageData, naturalSize: size };
};

interface UseProcessedImageResult {
  processedImage: ProcessedImage | null;
  isProcessing: boolean;
  error: string | null;
}

export const useProcessedImage = (file: File | null): UseProcessedImageResult => {
  const [processedImage, setProcessedImage] = useState<ProcessedImage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setProcessedImage(null);
      setError(null);
      return;
    }

    const process = async () => {
      setIsProcessing(true);
      setError(null);

      try {
        const [cropResult, date] = await Promise.all([cropToSquare(file), getDateFromFile(file)]);

        setProcessedImage({
          imageData: cropResult.imageData,
          naturalSize: cropResult.naturalSize,
          date,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to process image');
        setProcessedImage(null);
      } finally {
        setIsProcessing(false);
      }
    };

    process();
  }, [file]);

  return { processedImage, isProcessing, error };
};
