import { Group, Stack, Title } from '@mantine/core';

// A titled group of fields in a detail view
export const Section = ({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <Stack gap="xs">
    <Group justify="space-between">
      <Title order={5} c="dimmed">
        {title}
      </Title>
      {aside}
    </Group>
    {children}
  </Stack>
);
