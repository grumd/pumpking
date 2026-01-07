import type { MIXES } from '@/api/constants/mixes';
import { AreaSelector, type IArea } from '@bmunozg/react-image-area';
import { Alert, Button, Group, Popover, Stack, Text } from '@mantine/core';
import { useMutation } from '@tanstack/react-query';
import imageCompression from 'browser-image-compression';
import { useRef, useState } from 'react';

import { useLanguage } from 'utils/context/translation';
import { api } from 'utils/trpc';

import { cropAreaToDataUrl } from './cropImage';

export interface RecognizedScore {
  perfect: number;
  great: number;
  good: number;
  bad: number;
  miss: number;
  combo: number;
  score: number;
}

interface ScreenshotRecognitionProps {
  squareDataUrl: string;
  date?: Date | null;
  showDate?: boolean;
  onScoreRecognized?: (score: RecognizedScore) => void;
  mix: keyof typeof MIXES;
}

export const ScreenshotRecognition = ({
  squareDataUrl,
  date,
  mix,
  showDate,
  onScoreRecognized,
}: ScreenshotRecognitionProps) => {
  const lang = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const [areas, setAreas] = useState<IArea[]>([]);
  const [recognizedNumbers, setRecognizedNumbers] = useState<number[] | null>(null);
  // const [croppedPreview, setCroppedPreview] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isCropping, setIsCropping] = useState(false);

  const recognizeScoreMutation = useMutation(api.results.recognizeScoreMutation.mutationOptions());

  // useEffect(() => {
  //   if (areas.length === 0 || !imgRef.current) return undefined;
  //   const area = areas[0];
  //   const displayedSize = imgRef.current.clientWidth;
  //   cropAreaToDataUrl(squareDataUrl, area, displayedSize).then((t) => setCroppedPreview(t));
  // }, [squareDataUrl, areas]);

  const handleRecognizeScore = async () => {
    if (areas.length === 0 || !imgRef.current) return;

    try {
      setError(null);
      setIsCropping(true);
      const displayedSize = imgRef.current.clientWidth;
      const croppedImage = await cropAreaToDataUrl(squareDataUrl, areas[0], displayedSize);

      // Compress the cropped image before sending for recognition
      const croppedFile = await imageCompression.getFilefromDataUrl(croppedImage, 'cropped.png');
      const compressedFile = await imageCompression(croppedFile, {
        maxWidthOrHeight: 360,
        maxSizeMB: 0.03,
        initialQuality: 0.9,
      });
      const compressedImage = await imageCompression.getDataUrlFromFile(compressedFile);

      const numbers = await recognizeScoreMutation.mutateAsync({
        image: compressedImage,
        mix,
      });

      setRecognizedNumbers(numbers);
    } catch (e) {
      console.error('OCR error:', e);
      setError(e instanceof Error ? e.message : 'Recognition failed');
    } finally {
      setIsCropping(false);
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

  return (
    <Stack gap="xs">
      {showDate && (
        <Text size="xs" c="dimmed">
          {lang.DATE_TAKEN}: {date ? date.toLocaleString() : lang.UNKNOWN}
        </Text>
      )}

      <AreaSelector
        areas={areas}
        onChange={setAreas}
        maxAreas={1}
        globalAreaStyle={{
          border: '1.5px solid rgba(0, 0, 0, 0.7)',
          outline: '1.5px solid rgba(255, 255, 128, 0.7)',
        }}
      >
        <img
          ref={imgRef}
          style={{ maxWidth: '100%' }}
          src={squareDataUrl}
          alt="Screenshot preview"
        />
      </AreaSelector>

      {/* {croppedPreview && <img src={croppedPreview} alt="Cropped preview" />} */}

      {!recognizedNumbers && (
        <>
          {areas.length === 0 ? (
            <Alert color="yellow" p="sm">
              {lang.OCR_DRAW_RECTANGLE_HINT}
              <div>
                <Popover>
                  <Popover.Target>
                    <Button size="xs" color="blue" onClick={handleRecognizeScore}>
                      Tutorial
                    </Button>
                  </Popover.Target>
                  <Popover.Dropdown>
                    <video width="244" height="294" autoPlay loop muted>
                      <source src="crop_example.mp4" type="video/mp4" />
                    </video>
                  </Popover.Dropdown>
                </Popover>
              </div>
            </Alert>
          ) : (
            <Text size="xs" c="dimmed">
              {lang.OCR_AREA_SELECTED_HINT}
            </Text>
          )}
          <Button
            size="sm"
            variant="light"
            disabled={areas.length === 0}
            loading={recognizeScoreMutation.isPending || isCropping}
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
