import type { IArea } from '@bmunozg/react-image-area';

/**
 * Crops a selected area from a square image and returns a base64 data URL.
 * @param displayedSize - The size of the square image as displayed on screen
 */
export const cropAreaToDataUrl = (
  imageSrc: string,
  area: IArea,
  displayedSize: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Scale coordinates from displayed size to natural size
      const scale = img.naturalWidth / displayedSize;

      const scaledX = area.x * scale;
      const scaledY = area.y * scale;
      const scaledWidth = area.width * scale;
      const scaledHeight = area.height * scale;

      canvas.width = scaledWidth;
      canvas.height = scaledHeight;

      ctx.drawImage(
        img,
        scaledX,
        scaledY,
        scaledWidth,
        scaledHeight,
        0,
        0,
        scaledWidth,
        scaledHeight
      );

      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageSrc;
  });
};
