import { useEffect, useState } from 'react';

import { getDateFromFile } from './getDate';

export interface ProcessedImage {
  squareDataUrl: string;
  date: Date | null;
}

/**
 * Crops an image to a centered square and returns as dataUrl
 */
const cropToSquare = (imageSrc: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = Math.min(img.naturalWidth, img.naturalHeight);
      const x = (img.naturalWidth - size) / 2;
      const y = (img.naturalHeight - size) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, x, y, size, size, 0, 0, size, size);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageSrc;
  });
};

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      if (typeof fr.result === 'string') {
        resolve(fr.result);
      } else {
        reject(new Error('Invalid file'));
      }
    };
    fr.onerror = () => reject(new Error('Failed to read file'));
    fr.readAsDataURL(file);
  });
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
        const originalDataUrl = await fileToDataUrl(file);
        const [squareDataUrl, date] = await Promise.all([
          cropToSquare(originalDataUrl),
          getDateFromFile(originalDataUrl),
        ]);

        setProcessedImage({ squareDataUrl, date });
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
