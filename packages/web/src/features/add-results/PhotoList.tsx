import { Anchor, Badge, Button, Group, Stack, Text } from '@mantine/core';
import { NavLink } from 'react-router-dom';

import { Card } from 'components/Card/Card';
import { ChartLabel } from 'components/ChartLabel/ChartLabel';

import { routes } from 'constants/routes';

import { useLanguage } from 'utils/context/translation';

import { type PhotoStatus, type QueueItem, isDone } from './usePhotoQueue';

const STATUS_COLORS: Record<PhotoStatus, string> = {
  hashing: 'gray',
  waiting: 'gray',
  reading: 'blue',
  saved: 'green',
  duplicate: 'gray',
  needsInput: 'yellow',
  failed: 'red',
  limited: 'red',
  skipped: 'gray',
};

// In the user's time zone, e.g. "18 Oct, 14:05"
const formatRetryAt = (date: Date) =>
  date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

interface PhotoListProps {
  items: QueueItem[];
  onRetry: (item: QueueItem) => void;
  onEnterByHand: (item: QueueItem) => void;
  onSkip: (item: QueueItem) => void;
}

export const PhotoList = ({ items, onRetry, onEnterByHand, onSkip }: PhotoListProps) => {
  const lang = useLanguage();
  const statusLabels: Record<PhotoStatus, string> = {
    hashing: lang.PHOTO_WAITING,
    waiting: lang.PHOTO_WAITING,
    reading: lang.PHOTO_READING,
    saved: lang.PHOTO_SAVED,
    duplicate: lang.PHOTO_ALREADY_ADDED,
    needsInput: lang.PHOTO_NEEDS_INPUT,
    failed: lang.PHOTO_FAILED,
    limited: lang.PHOTO_LIMITED,
    skipped: lang.PHOTO_SKIPPED,
  };

  return (
    <Card
      title={lang.PHOTOS}
      actions={
        <Text c="dimmed" fz="sm">
          {lang.PHOTOS_DONE(items.filter(isDone).length, items.length)}
        </Text>
      }
    >
      <Stack gap="xxs">
        {items.map((item) => (
          <Card key={item.id} level={2}>
            <Stack gap="xxs">
              <Group justify="space-between" wrap="nowrap" gap="xs">
                {item.saved ? (
                  <Anchor
                    component={NavLink}
                    to={routes.leaderboard.sharedChart.getPath({
                      sharedChartId: item.saved.chart.sharedChartId,
                    })}
                    miw={0}
                  >
                    <Group gap="xxs" wrap="nowrap" component="span">
                      <Text span truncate inherit>
                        {item.saved.chart.songName}
                      </Text>
                      <ChartLabel label={item.saved.chart.label} />
                      <Text span inherit fw="bold">
                        {item.saved.score}
                      </Text>
                    </Group>
                  </Anchor>
                ) : (
                  <Text truncate c="dimmed" miw={0}>
                    {item.file.name}
                  </Text>
                )}
                <Badge color={STATUS_COLORS[item.status]} variant="light">
                  {statusLabels[item.status]}
                </Badge>
              </Group>
              {item.status === 'limited' && item.limited && (
                <>
                  <Text fz="sm" c="red">
                    {item.limited.limit === 'unproductive'
                      ? lang.PHOTO_LIMIT_UNPRODUCTIVE(formatRetryAt(item.limited.retryAt))
                      : lang.PHOTO_LIMIT_TOTAL(formatRetryAt(item.limited.retryAt))}
                  </Text>
                  <Group gap="xs">
                    <Button size="xs" variant="default" onClick={() => onEnterByHand(item)}>
                      {lang.ENTER_BY_HAND}
                    </Button>
                    <Button size="xs" variant="default" onClick={() => onSkip(item)}>
                      {lang.SKIP}
                    </Button>
                  </Group>
                </>
              )}
              {item.status === 'failed' && (
                <>
                  <Text fz="sm" c="red">
                    {item.file.name.toLowerCase().endsWith('.heic')
                      ? lang.HEIC_NOT_SUPPORTED
                      : item.error}
                  </Text>
                  <Group gap="xs">
                    <Button size="xs" onClick={() => onRetry(item)}>
                      {lang.TRY_AGAIN}
                    </Button>
                    {item.prepared && (
                      <Button size="xs" variant="default" onClick={() => onEnterByHand(item)}>
                        {lang.ENTER_BY_HAND}
                      </Button>
                    )}
                    <Button size="xs" variant="default" onClick={() => onSkip(item)}>
                      {lang.SKIP}
                    </Button>
                  </Group>
                </>
              )}
            </Stack>
          </Card>
        ))}
      </Stack>
    </Card>
  );
};
