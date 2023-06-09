import React, { useEffect, useState } from 'react';

import { getDateFromFile } from './getDate';

export const ScreenshotPreview = ({ file, showDate }) => {
  const [src, setSrc] = useState();
  const [date, setDate] = useState();
  const [error, setError] = useState();

  useEffect(() => {
    if (!FileReader) {
      setError('FileReader not supported');
      return;
    }

    if (file) {
      try {
        const fr = new FileReader();
        fr.onload = async () => {
          setSrc(fr.result);
          const date = await getDateFromFile(fr.result);
          setError(null);
          setDate(date);
        };
        fr.readAsDataURL(file);
      } catch (e) {
        setError(e.message);
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
