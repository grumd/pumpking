import { type MantineSize, useMatches } from '@mantine/core';

export type RowSizes = {
  name: MantineSize;
  score: MantineSize;
  scoreFraction: MantineSize;
  change: MantineSize;
  badge: MantineSize;
  date: MantineSize;
  /** The grade image's height */
  grade: string;
};

// Text, badge and grade sizes of a row. Phones have the room for larger ones: the step counts
// are narrow
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

// Once per chart card. Responsive props on the rows would add a <style> tag to each of them
export const useRowSizes = (): RowSizes =>
  useMatches({ base: rowSizes.phone, md: rowSizes.desktop }, { getInitialValueInEffect: false });
