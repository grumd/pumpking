import { Text } from '@mantine/core';

// Centered dimmed text for an empty list or search
export const EmptyState = ({ children }: { children: React.ReactNode }): JSX.Element => {
  return (
    <Text c="dimmed" ta="center" py="md">
      {children}
    </Text>
  );
};
