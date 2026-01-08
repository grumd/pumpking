import { useEffect, useRef } from 'react';

interface ImageDataPreviewProps {
  imageData: ImageData;
  style?: React.CSSProperties;
}

export const ImageDataPreview = ({ imageData, style }: ImageDataPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(imageData, 0, 0);
    }
  }, [imageData]);

  return <canvas ref={canvasRef} style={style} />;
};
