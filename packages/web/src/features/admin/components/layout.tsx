import { Group, Stack, Text, Title } from '@mantine/core';

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

// A read-only value with its label
export const Info = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <Text size="xs" c="dimmed">
      {label}
    </Text>
    <Text size="sm">{value}</Text>
  </div>
);
