import { Group, Text } from '@mantine/core';
import { FaTrophy } from 'react-icons/fa';

import css from './medal.module.css';

export type MedalType = 'gold' | 'silver' | 'bronze';

export const Medal = ({ medal, size = '1em' }: { medal: MedalType; size?: string }) => (
  <FaTrophy className={css.medal} color={`var(--mantine-color-${medal}-filled)`} size={size} />
);

export const MedalCounts = ({ cups, size }: { cups: Record<MedalType, number>; size?: string }) => (
  <Group gap="sm" wrap="nowrap">
    {(['gold', 'silver', 'bronze'] as const)
      .filter((medal) => cups[medal] > 0)
      .map((medal) => (
        <Group key={medal} gap="xxs" wrap="nowrap">
          <Medal medal={medal} size={size} />
          <Text span inherit>
            {cups[medal]}
          </Text>
        </Group>
      ))}
  </Group>
);
