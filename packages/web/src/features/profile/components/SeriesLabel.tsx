import { ColorSwatch, Group, rem } from '@mantine/core';

// A graph tooltip label with the color of its bar
export const SeriesLabel = ({ color, children }: { color: string; children: React.ReactNode }) => {
  return (
    <Group gap="xxs" wrap="nowrap">
      <ColorSwatch color={color} size={rem(10)} withShadow={false} />
      {children}
    </Group>
  );
};
