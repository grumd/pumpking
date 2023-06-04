import React, { useEffect, useState } from 'react';

import { getDateFromFile } from './getDate';

export const ScreenshotPreview = ({ file, showDate }) => {
  const [src, setSrc] = useState();
  const [date, setDate] = useState();

  useEffect(() => {
    if (FileReader && file) {
      const fr = new FileReader();
      fr.onload = () => {
        setSrc(fr.result);
      };
      fr.readAsDataURL(file);

      getDateFromFile(file).then(setDate);
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
    </div>
  );
};
