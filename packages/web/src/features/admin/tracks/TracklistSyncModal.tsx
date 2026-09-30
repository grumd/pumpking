import type { ApiInputs } from '@/api/trpc/router';
import {
  Alert,
  Button,
  FileInput,
  Group,
  List,
  Modal,
  ScrollArea,
  Stack,
  Text,
} from '@mantine/core';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { api } from 'utils/trpc';

import { useAdminAction } from '../activity/activity';

type TracklistFile = ApiInputs['admin']['tracks']['previewSync']['file'];

// Keeps only what the sync reads, so a large tracklist file stays a small request
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const slimTracklist = (json: any): TracklistFile => ({
  mixes: Object.fromEntries(Object.keys(json.mixes ?? {}).map((mix) => [mix, {}])),
  tracklist: Object.fromEntries(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Object.entries<any>(json.tracklist ?? {}).map(([key, track]) => [
      key,
      {
        title: track.title,
        shortTitle: track.shortTitle,
        duration: track.duration,
        arcadeID: track.arcadeID,
        altID: track.altID,
        charts: Object.fromEntries(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Object.entries<any>(track.charts ?? {}).map(([index, chart]) => [
            index,
            { type: chart.type },
          ])
        ),
        instances: Object.fromEntries(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Object.entries<any>(track.instances ?? {}).map(([mix, instances]) => [
            mix,
            Object.fromEntries(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              Object.entries<any>(instances).map(([index, instance]) => [
                index,
                { label: instance.label, level: instance.level, levelText: instance.levelText },
              ])
            ),
          ])
        ),
      },
    ])
  ),
});

interface TracklistSyncModalProps {
  opened: boolean;
  onClose: () => void;
}

// Replaces the legacy admin CLI's tracklist sync: pick the tracklist file, look at what
// it would change, then apply it
export const TracklistSyncModal = ({ opened, onClose }: TracklistSyncModalProps): JSX.Element => {
  const [file, setFile] = useState<TracklistFile | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const preview = useMutation(api.admin.tracks.previewSync.mutationOptions());
  const apply = useAdminAction(
    api.admin.tracks.applySync.mutationOptions({
      onSuccess: () => file && preview.mutate({ file }),
    }),
    () => 'Sync the tracklist'
  );

  const onFile = async (picked: File | null) => {
    setFile(null);
    setReadError(null);
    preview.reset();
    if (!picked) {
      return;
    }
    try {
      // The JSON round trip drops the fields a track doesn't have: sent as undefined, each
      // would add an entry to superjson's metadata and make the request several times larger
      const slim = JSON.parse(JSON.stringify(slimTracklist(JSON.parse(await picked.text()))));
      setFile(slim);
      preview.mutate({ file: slim });
    } catch (error) {
      setReadError(`Not a tracklist file: ${(error as Error).message}`);
    }
  };

  const result = preview.data;
  return (
    <Modal opened={opened} onClose={onClose} title="Sync the tracklist" size="xl">
      <Stack gap="sm">
        <FileInput
          label="Tracklist file"
          description="The tracklist JSON (Tracklist.json.txt) the legacy admin tool synced from"
          placeholder="Pick a file"
          accept=".json,.txt,application/json,text/plain"
          onChange={onFile}
          clearable
        />
        {readError && <Alert color="red">{readError}</Alert>}
        {preview.error && <Alert color="red">{preview.error.message}</Alert>}
        {preview.isPending && <Text c="dimmed">Comparing with the database…</Text>}

        {result && (
          <>
            <Text size="sm">
              {result.tracksInFile} tracks in the file.{' '}
              {result.changes.length === 0
                ? 'The database is up to date.'
                : `${result.changes.length} changes:`}
            </Text>
            {result.errors.length > 0 && (
              <Alert color="red" title="Can't be synced until these are fixed in the file">
                <List size="sm">
                  {result.errors.map((line) => (
                    <List.Item key={line}>{line}</List.Item>
                  ))}
                </List>
              </Alert>
            )}
            {result.warnings.length > 0 && (
              <Alert color="yellow" title={`${result.warnings.length} warnings`}>
                <ScrollArea.Autosize mah="8rem">
                  <List size="sm">
                    {result.warnings.map((line) => (
                      <List.Item key={line}>{line}</List.Item>
                    ))}
                  </List>
                </ScrollArea.Autosize>
              </Alert>
            )}
            {result.changes.length > 0 && (
              <ScrollArea.Autosize mah="20rem">
                <List size="sm" ff="monospace">
                  {result.changes.map((line, index) => (
                    <List.Item key={index}>{line}</List.Item>
                  ))}
                </List>
              </ScrollArea.Autosize>
            )}
          </>
        )}

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
          <Button
            loading={apply.isPending}
            disabled={!file || !result || result.errors.length > 0 || result.changes.length === 0}
            onClick={() => file && apply.mutate({ file })}
          >
            Apply {result?.changes.length ? `${result.changes.length} changes` : ''}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
