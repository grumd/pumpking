import { Badge, Button, Drawer, Group, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { FaListUl } from 'react-icons/fa';

import { Card } from 'components/Card/Card';

import { useActivity } from './activity';

// The button that opens the activity log, and the log itself
export const ActivityDrawer = (): JSX.Element => {
  const activity = useActivity();
  const [opened, { open, close }] = useDisclosure(false);
  const errors = activity.filter((entry) => !entry.ok).length;

  return (
    <>
      <Button
        variant="default"
        size="xs"
        leftSection={<FaListUl />}
        rightSection={
          errors > 0 ? (
            <Badge color="red" size="sm">
              {errors}
            </Badge>
          ) : undefined
        }
        onClick={open}
      >
        Activity
      </Button>
      <Drawer opened={opened} onClose={close} position="right" size="lg" title="Activity">
        {activity.length === 0 && <Text c="dimmed">Nothing done yet in this session</Text>}
        <Stack gap="xs">
          {activity.map((entry) => (
            <Card key={entry.id} level={2}>
              <Group justify="space-between" wrap="nowrap" mb="xxs">
                <Text fw={600} c={entry.ok ? undefined : 'red.4'}>
                  {entry.title}
                </Text>
                <Text size="xs" c="dimmed">
                  {entry.at.toLocaleTimeString()}
                </Text>
              </Group>
              {entry.lines.map((line, index) => (
                <Text key={index} size="sm" ff="monospace" style={{ wordBreak: 'break-word' }}>
                  {line}
                </Text>
              ))}
            </Card>
          ))}
        </Stack>
      </Drawer>
    </>
  );
};
