import { Group, Text } from '@mantine/core';
import { FaTrophy } from 'react-icons/fa';

export type MedalType = 'gold' | 'silver' | 'bronze';

const colors: Record<MedalType, string> = {
  gold: '#e8b923',
  silver: '#c0c0c0',
  bronze: '#cd7f32',
};

export const Medal = ({ medal, size = '1em' }: { medal: MedalType; size?: string }) => (
  <FaTrophy color={colors[medal]} size={size} style={{ verticalAlign: 'middle', flexShrink: 0 }} />
);

export const MedalCounts = ({ cups, size }: { cups: Record<MedalType, number>; size?: string }) => (
  <Group gap="sm" wrap="nowrap">
    {(['gold', 'silver', 'bronze'] as const)
      .filter((medal) => cups[medal] > 0)
      .map((medal) => (
        <Group key={medal} gap={4} wrap="nowrap">
          <Medal medal={medal} size={size} />
          <Text span inherit>
            {cups[medal]}
          </Text>
        </Group>
      ))}
  </Group>
);
