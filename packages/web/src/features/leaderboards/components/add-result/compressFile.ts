import imageCompression from 'browser-image-compression';

export const compressFile = (file: File) => {
  return imageCompression(file, { maxWidthOrHeight: 1400, maxSizeMB: 0.1, initialQuality: 0.7 });
};
