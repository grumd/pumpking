import { Flex } from '@mantine/core';

import { SeriesLabel } from './SeriesLabel';

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
