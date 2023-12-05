import { useEffect, useState } from 'react';

import { getDateFromFile } from './getDate';

export const ScreenshotPreview = ({
  file,
  showDate,
}: {
  file: File | null;
  showDate?: boolean;
}) => {
  const [src, setSrc] = useState<string | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!FileReader) {
      setError('FileReader not supported');
      return;
    }

    if (file) {
      try {
        const fr = new FileReader();
        fr.onload = async () => {
          const dataUrl = fr.result;
          if (typeof dataUrl !== 'string') throw new Error('Invalid file');

          setSrc(dataUrl);
          const date = await getDateFromFile(dataUrl);
          setError(null);
          setDate(date);
        };
        fr.readAsDataURL(file);
      } catch (e: unknown) {
        e instanceof Error && setError(e.message);
      }
    } else {
      setSrc(null);
      setDate(null);
      setError(null);
    }
  }, [file]);

  if (!src) return null;

  return (
    <div>
      <img
        style={{ maxHeight: 270, maxWidth: '100%', objectFit: 'contain' }}
        src={src}
        alt="Screenshot preview"
      />
      {showDate && (
        <div style={{ fontSize: '75%', padding: '0.4em' }}>
          Date taken: {date ? date.toLocaleString() : 'Unknown'}
        </div>
      )}
      {error && <div style={{ fontSize: '75%', padding: '0.4em' }}>Error: {error}</div>}
    </div>
  );
};
