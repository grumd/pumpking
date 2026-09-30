import { useEffect, useState } from 'react';

// A URL for showing or saving a blob, revoked when the blob changes or the component unmounts
export const useObjectUrl = (blob: Blob | undefined): string | undefined => {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  return url;
};
