import { Group } from '@mantine/core';

import { SeriesLabel } from './SeriesLabel';

// The series of a graph under it: a color dot and a name each
export const GraphLegend = ({ items }: { items: Array<{ label: string; color: string }> }) => {
  return (
    <Group gap="xs" justify="center" fz="xs" c="dimmed" mt="xxs">
      {items.map((item) => (
        <SeriesLabel key={item.label} color={item.color}>
          {item.label}
        </SeriesLabel>
      ))}
    </Group>
  );
};
