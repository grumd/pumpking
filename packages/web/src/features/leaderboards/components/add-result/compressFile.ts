import imageCompression from 'browser-image-compression';

export const compressFile = (file: File) => {
  return imageCompression(file, { maxWidthOrHeight: 1400, maxSizeMB: 0.1, initialQuality: 0.7 });
};

export const compressDataUrl = async (dataUrl: string): Promise<string> => {
  const file = await imageCompression.getFilefromDataUrl(dataUrl, 'image.jpg');
  const compressed = await imageCompression(file, {
    maxWidthOrHeight: 1200,
    maxSizeMB: 0.1,
    initialQuality: 0.8,
  });
  return imageCompression.getDataUrlFromFile(compressed);
};
