import { AreaSelector, type IArea } from '@bmunozg/react-image-area';
import { Alert, Button, Group, Popover, SimpleGrid, Stack, Text, rem } from '@mantine/core';
import type { MIXES } from '@pumpking/utils/mixes';
import { useMutation } from '@tanstack/react-query';
import imageCompression from 'browser-image-compression';
import { useCallback, useEffect, useRef, useState } from 'react';

import { KeyValueList } from 'components/KeyValueList/KeyValueList';

import { useLanguage } from 'utils/context/translation';
import { api } from 'utils/trpc';

import css from './add-result.module.css';
import {
  applyProcessing,
  imageDataToCanvas,
  prepareImageForRecognition,
  shrinkAreaToBrightness,
} from './imageUtils';
import { JUDGEMENTS } from './judgements';

// A number that wasn't recognized is negative
const formatNumber = (value: number) => (value >= 0 ? value : '?');

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
  imageData: ImageData;
  naturalSize: number;
  date?: Date | null;
  showDate?: boolean;
  onScoreRecognized?: (score: RecognizedScore) => void;
  mix: keyof typeof MIXES;
}

export const ScreenshotRecognition = ({
  imageData: originalImageData,
  naturalSize,
  date,
  mix,
  showDate,
  onScoreRecognized,
}: ScreenshotRecognitionProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageDataRef = useRef<ImageData | undefined>();

  const drawToCanvas = (data: ImageData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = data.width;
    canvas.height = data.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(data, 0, 0);
    }
  };

  useEffect(() => {
    imageDataRef.current = structuredClone(originalImageData);
    drawToCanvas(imageDataRef.current);
    setAreas([]);
  }, [originalImageData]);

  const lang = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const [areas, setAreas] = useState<IArea[]>([]);
  const [recognizedNumbers, setRecognizedNumbers] = useState<number[] | null>(null);
  const areaSelectorRef = useRef<HTMLDivElement>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [debugImage, setDebugImage] = useState<string>();
  const isInteractingRef = useRef(false);
  const areasRef = useRef(areas);
  areasRef.current = areas;

  const handleAreasChange = (newAreas: IArea[]) => {
    isInteractingRef.current = true;
    setAreas(newAreas);
  };

  const triggerShrink = useCallback(() => {
    if (!isInteractingRef.current) return;
    isInteractingRef.current = false;

    const currentAreas = areasRef.current;

    if (currentAreas.length === 0 || !canvasRef.current) return;

    const area = currentAreas[0];
    const displayedSize = canvasRef.current.clientWidth;

    // crop to get a new area
    const shrunkArea = shrinkAreaToBrightness(originalImageData, naturalSize, area, displayedSize);

    if (imageDataRef.current) {
      // apply processing filter to cropped area
      const scale = naturalSize / displayedSize;
      applyProcessing(
        imageDataRef.current,
        originalImageData,
        Math.round(shrunkArea.x * scale),
        Math.round(shrunkArea.y * scale),
        Math.round(shrunkArea.width * scale),
        Math.round(shrunkArea.height * scale)
      );
      drawToCanvas(imageDataRef.current);
    }

    setAreas([shrunkArea]);
  }, [naturalSize, originalImageData]);

  useEffect(() => {
    const handlePointerUp = () => {
      // trigger shrink after AreaSelector finishes event handling
      setTimeout(triggerShrink, 0);
    };

    document.addEventListener('pointerup', handlePointerUp, { capture: true });

    return () => {
      document.removeEventListener('pointerup', handlePointerUp, { capture: true });
    };
  }, [triggerShrink]);

  const recognizeScoreMutation = useMutation(api.results.recognizeScoreMutation.mutationOptions());

  // useEffect(() => {
  //   if (areas.length === 0 || !imgRef.current) return undefined;
  //   const area = areas[0];
  //   const displayedSize = imgRef.current.clientWidth;
  //   prepareImageForRecognition(squareDataUrl, area, displayedSize).then((t) =>
  //     setCroppedPreview(t)
  //   );
  // }, [squareDataUrl, areas]);

  const handleRecognizeScore = async () => {
    if (areas.length === 0 || !canvasRef.current || !imageDataRef.current) return;

    try {
      setError(null);
      setIsCropping(true);
      const displayedSize = canvasRef.current.clientWidth;

      // Get processed ImageData (synchronous)
      const croppedImageData = prepareImageForRecognition(
        originalImageData,
        naturalSize,
        areas[0],
        displayedSize
      );

      // Convert to canvas and compress for API
      const croppedCanvas = imageDataToCanvas(croppedImageData);
      const croppedFile = await imageCompression.canvasToFile(
        croppedCanvas,
        'image/webp',
        'cropped.webp',
        new Date().getTime()
      );
      const compressedFile = await imageCompression(croppedFile, {
        maxWidthOrHeight: 340,
        maxSizeMB: 0.015,
        fileType: 'image/webp',
      });
      const compressedImage = await imageCompression.getDataUrlFromFile(compressedFile);

      setDebugImage(compressedImage);

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
    <Stack gap="xs" ref={areaSelectorRef}>
      {showDate && (
        <Text size="xs" c="dimmed">
          {lang.DATE_TAKEN}: {date ? date.toLocaleString() : lang.UNKNOWN}
        </Text>
      )}

      <AreaSelector
        areas={areas}
        onChange={handleAreasChange}
        maxAreas={1}
        globalAreaStyle={{
          border: `${rem(1.5)} solid color-mix(in srgb, var(--pk-surface-page) 70%, transparent)`,
          outline: `${rem(1.5)} solid var(--mantine-color-accent-filled)`,
        }}
      >
        <canvas ref={canvasRef} className={css.canvas} />
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
            <Text size="sm" c="dimmed">
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
        <Alert color="blue" title={lang.RECOGNIZED_NUMBERS}>
          <Stack gap="xs">
            <SimpleGrid cols={{ base: 1, xs: 2 }}>
              <KeyValueList
                items={[
                  ...JUDGEMENTS.map((judgement, index) => ({
                    label: (
                      <Text span inherit c={judgement.key}>
                        {judgement.label}:
                      </Text>
                    ),
                    value: (
                      <Text span inherit c={judgement.key}>
                        {formatNumber(recognizedNumbers[index])}
                      </Text>
                    ),
                  })),
                  { label: 'Combo:', value: formatNumber(recognizedNumbers[5]) },
                  {
                    label: (
                      <Text span inherit fw="bold">
                        Score:
                      </Text>
                    ),
                    value: (
                      <Text span inherit fw="bold">
                        {formatNumber(recognizedNumbers[6])}
                      </Text>
                    ),
                  },
                ]}
              />
              {debugImage && (
                <img src={debugImage} alt={lang.OCR_SELECTED_AREA} className={css.recognizedArea} />
              )}
            </SimpleGrid>
            <Group gap="xs">
              <Button size="xs" color="blue" onClick={handleConfirmRecognition}>
                {lang.FILL_FORM}
              </Button>
              <Button size="xs" variant="light" onClick={handleCancelRecognition}>
                {lang.CANCEL}
              </Button>
            </Group>
          </Stack>
        </Alert>
      )}

      {error && (
        <Text size="sm" c="red">
          {lang.ERROR}: {error}
        </Text>
      )}
    </Stack>
  );
};
