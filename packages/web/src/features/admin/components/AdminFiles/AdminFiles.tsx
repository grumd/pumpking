import type { AdminFileSource } from '@/api/services/admin/files';
import { Button, Code, SimpleGrid, Text } from '@mantine/core';
import type { UseQueryResult } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { FaDownload } from 'react-icons/fa';

import { Card } from 'components/Card/Card';
import Loader from 'components/Loader/Loader';

import { useLanguage } from 'utils/context/translation';

import { type AdminFile, useAdminFile } from '../../hooks/useAdminFile';
import { useObjectUrl } from '../../hooks/useObjectUrl';

interface FileCardProps {
  title: string;
  query: UseQueryResult<AdminFile, Error>;
  children: (file: AdminFile, url: string) => React.ReactNode;
}

const FileCard = ({ title, query, children }: FileCardProps): JSX.Element => {
  const lang = useLanguage();
  const url = useObjectUrl(query.data?.blob);

  return (
    <Card
      title={title}
      headerNode={
        query.data &&
        url && (
          <Button
            component="a"
            href={url}
            download={query.data.fileName}
            size="xs"
            leftSection={<FaDownload />}
          >
            {lang.DOWNLOAD}
          </Button>
        )
      }
    >
      {query.isLoading && <Loader />}
      {query.error && <Text c="dimmed">{query.error.message}</Text>}
      {query.data && url && (
        <>
          {children(query.data, url)}
          <Text size="xs" c="dimmed" mt="xxs">
            {query.data.fileName}
          </Text>
        </>
      )}
    </Card>
  );
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
    <Code block mah="30em" style={{ overflow: 'auto' }}>
      {text}
    </Code>
  );
};

interface AdminFilesProps {
  source: AdminFileSource;
  id: number;
}

// The screen file (a screenshot or a video) and the scan JSON of a result or purgatory row
export const AdminFiles = ({ source, id }: AdminFilesProps): JSX.Element => {
  const lang = useLanguage();
  const screen = useAdminFile(source, id, 'screen');
  const scan = useAdminFile(source, id, 'scan');

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }}>
      <FileCard title={lang.ADMIN_SCREEN_FILE} query={screen}>
        {(file, url) =>
          file.blob.type.startsWith('video/') ? (
            <video src={url} controls loop muted autoPlay style={{ width: '100%' }} />
          ) : (
            <img src={url} alt={file.fileName} style={{ width: '100%' }} />
          )
        }
      </FileCard>
      <FileCard title={lang.ADMIN_SCAN_FILE} query={scan}>
        {(file) => <ScanJson blob={file.blob} />}
      </FileCard>
    </SimpleGrid>
  );
};
