import { AreaSelector, type IArea } from '@bmunozg/react-image-area';
import { Alert, Button, Group, Stack, Text } from '@mantine/core';
import { useMutation } from '@tanstack/react-query';
import imageCompression from 'browser-image-compression';
import { useEffect, useRef, useState } from 'react';

import { useLanguage } from 'utils/context/translation';
import { api } from 'utils/trpc';

import { cropImageToBase64 } from './cropImage';
import { getDateFromFile } from './getDate';

interface RecognizedScore {
  perfect: number;
  great: number;
  good: number;
  bad: number;
  miss: number;
  combo: number;
  score: number;
}

export const ScreenshotPreview = ({
  file,
  showDate,
  enableOcr,
  onScoreRecognized,
}: {
  file: File | null;
  showDate?: boolean;
  enableOcr?: boolean;
  onScoreRecognized?: (score: RecognizedScore) => void;
}) => {
  const lang = useLanguage();
  const [src, setSrc] = useState<string | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [areas, setAreas] = useState<IArea[]>([]);
  const [recognizedNumbers, setRecognizedNumbers] = useState<number[] | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const recognizeScoreMutation = useMutation(api.results.recognizeScoreMutation.mutationOptions());

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
      setAreas([]);
      setRecognizedNumbers(null);
    }
  }, [file]);

  const handleRecognizeScore = async () => {
    if (!src || areas.length === 0 || !imgRef.current) return;

    try {
      setError(null);
      const displayedWidth = imgRef.current.clientWidth;
      const displayedHeight = imgRef.current.clientHeight;
      const croppedImage = await cropImageToBase64(src, areas[0], displayedWidth, displayedHeight);

      // Compress the cropped image before sending for recognition
      const croppedFile = await imageCompression.getFilefromDataUrl(croppedImage, 'cropped.png');
      const compressedFile = await imageCompression(croppedFile, {
        maxWidthOrHeight: 360,
        maxSizeMB: 0.03,
        initialQuality: 0.9,
        // maxWidthOrHeight: 360,
        // maxSizeMB: 0.032,
        // initialQuality: 0.95,
      });
      const compressedImage = await imageCompression.getDataUrlFromFile(compressedFile);

      const numbers = await recognizeScoreMutation.mutateAsync({
        image: compressedImage,
      });

      setRecognizedNumbers(numbers);
    } catch (e) {
      console.error('OCR error:', e);
      setError(e instanceof Error ? e.message : 'Recognition failed');
    }
  };

  const handleConfirmRecognition = () => {
    if (!recognizedNumbers) return;

    const [perfect, great, good, bad, miss, combo, score] = recognizedNumbers;

    onScoreRecognized?.({
      perfect: perfect >= 0 ? perfect : -1,
      great: great >= 0 ? great : -1,
      good: good >= 0 ? good : -1,
      bad: bad >= 0 ? bad : -1,
      miss: miss >= 0 ? miss : -1,
      combo: combo >= 0 ? combo : -1,
      score: score >= 0 ? score : -1,
    });

    setRecognizedNumbers(null);
  };

  const handleCancelRecognition = () => {
    setRecognizedNumbers(null);
  };

  if (!src) return null;

  return (
    <Stack gap="xs">
      {showDate && (
        <Text size="xs" c="dimmed">
          {lang.DATE_TAKEN}: {date ? date.toLocaleString() : lang.UNKNOWN}
        </Text>
      )}
      {enableOcr ? (
        <AreaSelector
          areas={areas}
          onChange={setAreas}
          maxAreas={1}
          wrapperStyle={{ maxWidth: '100%' }}
        >
          <img
            ref={imgRef}
            style={{ maxHeight: 400, maxWidth: '100%', objectFit: 'contain' }}
            src={src}
            alt="Screenshot preview"
          />
        </AreaSelector>
      ) : (
        <img
          style={{ maxHeight: 270, maxWidth: '100%', objectFit: 'contain' }}
          src={src}
          alt="Screenshot preview"
        />
      )}

      {enableOcr && !recognizedNumbers && (
        <>
          <Text size="xs" c="dimmed">
            {areas.length === 0 ? lang.OCR_DRAW_RECTANGLE_HINT : lang.OCR_AREA_SELECTED_HINT}
          </Text>
          <Button
            size="sm"
            variant="light"
            disabled={areas.length === 0}
            loading={recognizeScoreMutation.isPending}
            onClick={handleRecognizeScore}
          >
            {lang.RECOGNIZE_SCORE}
          </Button>
        </>
      )}

      {recognizedNumbers && (
        <Alert color="blue" title={lang.RECOGNIZED_NUMBERS} radius="md">
          <Stack gap="xs">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.2em' }}>
              <Text size="sm" c="cyan">
                Perfect:
              </Text>
              <Text size="sm" c="cyan">
                {recognizedNumbers[0] >= 0 ? recognizedNumbers[0] : '?'}
              </Text>
              <Text size="sm" c="green">
                Great:
              </Text>
              <Text size="sm" c="green">
                {recognizedNumbers[1] >= 0 ? recognizedNumbers[1] : '?'}
              </Text>
              <Text size="sm" c="yellow">
                Good:
              </Text>
              <Text size="sm" c="yellow">
                {recognizedNumbers[2] >= 0 ? recognizedNumbers[2] : '?'}
              </Text>
              <Text size="sm" c="pink">
                Bad:
              </Text>
              <Text size="sm" c="pink">
                {recognizedNumbers[3] >= 0 ? recognizedNumbers[3] : '?'}
              </Text>
              <Text size="sm" c="red">
                Miss:
              </Text>
              <Text size="sm" c="red">
                {recognizedNumbers[4] >= 0 ? recognizedNumbers[4] : '?'}
              </Text>
              <Text size="sm">Combo:</Text>
              <Text size="sm">{recognizedNumbers[5] >= 0 ? recognizedNumbers[5] : '?'}</Text>
              <Text size="sm" fw="bold">
                Score:
              </Text>
              <Text size="sm" fw="bold">
                {recognizedNumbers[6] >= 0 ? recognizedNumbers[6] : '?'}
              </Text>
            </div>
            <Group gap="xs">
              <Button size="xs" color="blue" onClick={handleConfirmRecognition}>
                {lang.FILL_FORM}
              </Button>
              <Button size="xs" variant="light" color="gray" onClick={handleCancelRecognition}>
                {lang.CANCEL}
              </Button>
            </Group>
          </Stack>
        </Alert>
      )}

      {error && (
        <Text size="xs" c="red">
          {lang.ERROR}: {error}
        </Text>
      )}
    </Stack>
  );
};
