import { Text } from '@mantine/core';

export const EmptyState = ({ children }: { children: React.ReactNode }): JSX.Element => {
  return (
    <Text c="dimmed" ta="center" py="md">
      {children}
    </Text>
  );
};
