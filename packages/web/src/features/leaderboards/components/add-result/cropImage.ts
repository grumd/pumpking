import type { IArea } from '@bmunozg/react-image-area';

/**
 * Crops an image to the selected area and returns a base64 data URL
 * @param displayedWidth - The width of the image as displayed on screen
 * @param displayedHeight - The height of the image as displayed on screen
 */
export const cropImageToBase64 = (
  imageSrc: string,
  area: IArea,
  displayedWidth: number,
  displayedHeight: number
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

      // Scale coordinates from displayed size to actual image size
      const scaleX = img.naturalWidth / displayedWidth;
      const scaleY = img.naturalHeight / displayedHeight;

      const scaledX = area.x * scaleX;
      const scaledY = area.y * scaleY;
      const scaledWidth = area.width * scaleX;
      const scaledHeight = area.height * scaleY;

      // Set canvas size to the cropped area dimensions (at original resolution)
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;

      console.log({
        scaledWidth,
        scaledHeight,
      });

      // Draw the cropped portion of the image
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

      // Convert to base64 (JPEG for smaller size)
      const base64 = canvas.toDataURL('image/jpeg', 0.9);
      resolve(base64);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageSrc;
  });
};
