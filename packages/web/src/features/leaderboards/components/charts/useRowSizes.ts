import { type MantineSize, useMatches } from '@mantine/core';

export type RowSizes = {
  name: MantineSize;
  score: MantineSize;
  scoreFraction: MantineSize;
  change: MantineSize;
  badge: MantineSize;
  date: MantineSize;
  grade: string;
};

const rowSizes: Record<'phone' | 'desktop', RowSizes> = {
  phone: {
    name: 'lg',
    score: 'xl',
    scoreFraction: 'md',
    change: 'sm',
    badge: 'md',
    date: 'sm',
    grade: '1.25rem',
  },
  desktop: {
    name: 'sm',
    score: 'md',
    scoreFraction: 'xs',
    change: 'xs',
    badge: 'xs',
    date: 'xs',
    grade: '1rem',
  },
};

export const useRowSizes = (): RowSizes =>
  useMatches({ base: rowSizes.phone, md: rowSizes.desktop }, { getInitialValueInEffect: false });
