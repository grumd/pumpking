import { Box, type MantineBreakpoint } from '@mantine/core';

import css from './key-value-list.module.css';

type Item = {
  label: React.ReactNode;
  value: React.ReactNode;
  // Hides the whole row from this breakpoint up (e.g. when a table column shows it there)
  hiddenFrom?: MantineBreakpoint;
};

interface KeyValueListProps {
  // Falsy items are skipped, so items can be conditional
  items: Array<Item | false | null | undefined>;
}

// Dimmed labels on the left, values on the right
export const KeyValueList = ({ items }: KeyValueListProps): JSX.Element => {
  return (
    <dl className={css.list}>
      {items.filter(Boolean).map((item, index) => {
        const { label, value, hiddenFrom } = item as Item;
        return (
          <Box key={index} className={css.item} hiddenFrom={hiddenFrom}>
            <dt className={css.label}>{label}</dt>
            <dd className={css.value}>{value}</dd>
          </Box>
        );
      })}
    </dl>
  );
};
