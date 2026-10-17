import { Button, FileButton, Select, Stack, Text } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { useRef } from 'react';

import { Card } from 'components/Card/Card';
import { ErrorAlert } from 'components/ErrorAlert/ErrorAlert';
import { PageContainer } from 'components/PageContainer/PageContainer';

import { useUser } from 'hooks/useUser';

import { useLanguage } from 'utils/context/translation';

import { PhotoForm } from './PhotoForm';
import { PhotoList } from './PhotoList';
import { PHOTO_MIXES, type PhotoMix, usePhotoQueue } from './usePhotoQueue';

const MIX_OPTIONS: { value: PhotoMix; label: string }[] = [
  { value: 'Phoenix2', label: 'Phoenix 2' },
  { value: 'Phoenix', label: 'Phoenix' },
  { value: 'XX', label: 'XX' },
];

const isPhotoMix = (mix: string | null | undefined): mix is PhotoMix =>
  PHOTO_MIXES.includes(mix as PhotoMix);

/**
 * Results from photos of their screens: song, chart and stats are read from each photo and
 * saved when they check out; a photo in doubt asks for the fields in doubt
 */
const AddResults = () => {
  const lang = useLanguage();
  const user = useUser();
  // Shared with the chart page's "add result", which can also have older mixes
  const [storedMix, setStoredMix] = useLocalStorage<string | null>({
    key: 'addResult_lastMix',
    defaultValue: null,
  });
  const mix: PhotoMix = isPhotoMix(storedMix) ? storedMix : 'Phoenix2';
  const resetFiles = useRef<() => void>(null);
  const queue = usePhotoQueue();
  const current = queue.items.find((item) => item.status === 'needsInput');

  if (!user.data) {
    return null;
  }
  if (!user.data.can_add_results_manually) {
    return (
      <PageContainer width="narrow">
        <ErrorAlert>{lang.NO_ACCESS_TO_PAGE}</ErrorAlert>
      </PageContainer>
    );
  }

  return (
    <PageContainer width="narrow">
      <Card title={lang.ADD_RESULTS}>
        <Stack gap="xs">
          <Text c="dimmed">{lang.PHOTOS_HINT}</Text>
          <Select
            label={lang.MIX}
            data={MIX_OPTIONS}
            value={mix}
            allowDeselect={false}
            disabled={queue.busy}
            onChange={(value) => value && setStoredMix(value)}
          />
          <FileButton
            resetRef={resetFiles}
            accept="image/*"
            multiple
            onChange={(files) => {
              if (files.length > 0) {
                queue.addFiles(files, mix);
              }
              resetFiles.current?.();
            }}
          >
            {(props) => (
              <Button {...props} disabled={queue.busy}>
                {lang.SELECT_PHOTOS}
              </Button>
            )}
          </FileButton>
          {queue.busy && (
            <Button variant="default" onClick={queue.cancel}>
              {lang.CANCEL_THE_REST}
            </Button>
          )}
        </Stack>
      </Card>
      {current?.needsInput && (
        <PhotoForm
          key={current.id}
          item={current}
          needsInput={current.needsInput}
          onSubmit={(chart, values) => queue.submit(current, chart, values)}
          onSkip={() => queue.skip(current)}
        />
      )}
      {queue.items.length > 0 && (
        <PhotoList
          items={queue.items}
          onRetry={queue.retry}
          onEnterByHand={queue.enterByHand}
          onSkip={queue.skip}
        />
      )}
    </PageContainer>
  );
};

export default AddResults;
