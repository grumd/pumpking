import { Paper } from '@mantine/core';

// The box of a graph tooltip. The border separates it from the card under it
export const GraphTooltip = ({ children }: { children: React.ReactNode }): JSX.Element => {
  return (
    <Paper p="xs" withBorder bg="var(--pk-surface-1)">
      {children}
    </Paper>
  );
};
