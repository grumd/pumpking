import { Flex } from '@mantine/core';

import { SeriesLabel } from './SeriesLabel';

// The series of a graph under it: a color dot and a name each. Rows close together, so a
// legend that wraps (the grades) leaves the graph its room
export const GraphLegend = ({ items }: { items: Array<{ label: string; color: string }> }) => {
  return (
    <Flex gap="xs" rowGap="xxs" wrap="wrap" justify="center" fz="xs" lh="xs" c="dimmed" mt="xxs">
      {items.map((item) => (
        <SeriesLabel key={item.label} color={item.color}>
          {item.label}
        </SeriesLabel>
      ))}
    </Flex>
  );
};
