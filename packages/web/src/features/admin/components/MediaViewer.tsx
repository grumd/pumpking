import type { AdminFileSource } from '@/api/services/admin/files';
import { Accordion, AspectRatio, Button, Center, Code, Group, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEffect, useRef, useState } from 'react';
import { FaCopy, FaDownload } from 'react-icons/fa';

import Loader from 'components/Loader/Loader';

import { useAdminFile } from '../hooks/useAdminFile';
import { useObjectUrl } from '../hooks/useObjectUrl';

// Copies the image, or the video's current frame, as a PNG
const copyFrame = async (element: HTMLImageElement | HTMLVideoElement) => {
  const canvas = document.createElement('canvas');
  canvas.width = element instanceof HTMLVideoElement ? element.videoWidth : element.naturalWidth;
  canvas.height = element instanceof HTMLVideoElement ? element.videoHeight : element.naturalHeight;
  canvas.getContext('2d')?.drawImage(element, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    throw new Error('Could not read the frame');
  }
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
};

const ScanJson = ({ blob }: { blob: Blob }): JSX.Element => {
  const [text, setText] = useState('');
  useEffect(() => {
    blob.text().then((content) => {
      try {
        setText(JSON.stringify(JSON.parse(content), null, 2));
      } catch {
        setText(content);
      }
    });
  }, [blob]);
  return (
    <Code block mah="24rem" style={{ overflow: 'auto' }}>
      {text}
    </Code>
  );
};

interface MediaViewerProps {
  source: AdminFileSource;
  id: number;
}

/**
 * The screen file of a result or purgatory row (a screenshot, or a video that plays),
 * with buttons to copy the frame and download the files, and its scan JSON (what piu-spy
 * recognized on it)
 */
export const MediaViewer = ({ source, id }: MediaViewerProps): JSX.Element => {
  const screen = useAdminFile(source, id, 'screen');
  const scan = useAdminFile(source, id, 'scan');
  const screenUrl = useObjectUrl(screen.data?.blob);
  const scanUrl = useObjectUrl(scan.data?.blob);
  const mediaRef = useRef<HTMLImageElement & HTMLVideoElement>(null);
  const isVideo = screen.data?.blob.type.startsWith('video/');

  const onCopy = () => {
    if (!mediaRef.current) {
      return;
    }
    copyFrame(mediaRef.current).then(
      () => notifications.show({ color: 'teal', message: 'Frame copied to the clipboard' }),
      (error: Error) => notifications.show({ color: 'red', message: error.message })
    );
  };

  return (
    <Stack gap="xs">
      <AspectRatio ratio={16 / 9} bg="dark.8" style={{ borderRadius: 'var(--mantine-radius-md)' }}>
        {screen.isLoading && <Loader />}
        {screen.error && !screen.data && (
          <Center>
            <Text c="dimmed">Screen file: {screen.error.message}</Text>
          </Center>
        )}
        {screenUrl &&
          (isVideo ? (
            <video
              ref={mediaRef}
              src={screenUrl}
              controls
              loop
              muted
              autoPlay
              style={{ objectFit: 'contain' }}
            />
          ) : (
            <img
              ref={mediaRef}
              src={screenUrl}
              alt={screen.data?.fileName}
              style={{ objectFit: 'contain' }}
            />
          ))}
      </AspectRatio>

      <Group gap="xs">
        <Button
          size="xs"
          variant="default"
          leftSection={<FaCopy />}
          onClick={onCopy}
          disabled={!screenUrl}
          title={isVideo ? 'Copies the frame the video is on' : undefined}
        >
          Copy {isVideo ? 'frame' : 'image'}
        </Button>
        <Button
          size="xs"
          variant="default"
          leftSection={<FaDownload />}
          component="a"
          href={screenUrl}
          download={screen.data?.fileName}
          disabled={!screenUrl}
        >
          Screen file
        </Button>
        <Button
          size="xs"
          variant="default"
          leftSection={<FaDownload />}
          component="a"
          href={scanUrl}
          download={scan.data?.fileName}
          disabled={!scanUrl}
        >
          Scan JSON
        </Button>
        {screen.data && (
          <Text size="xs" c="dimmed">
            {screen.data.fileName}
          </Text>
        )}
      </Group>

      <Accordion variant="contained" chevronPosition="left">
        <Accordion.Item value="scan">
          <Accordion.Control disabled={!scan.data}>
            Scan JSON{' '}
            {scan.error && !scan.data && (
              <Text span size="xs" c="dimmed">
                ({scan.error.message})
              </Text>
            )}
          </Accordion.Control>
          <Accordion.Panel>{scan.data && <ScanJson blob={scan.data.blob} />}</Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
};
