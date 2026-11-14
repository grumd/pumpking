import { Box, type MantineBreakpoint } from '@mantine/core';

import css from './key-value-list.module.css';

type Item = {
  label: React.ReactNode;
  value: React.ReactNode;
  hiddenFrom?: MantineBreakpoint;
};

interface KeyValueListProps {
  items: Array<Item | false | null | undefined>;
  noWrap?: boolean;
}

export const KeyValueList = ({ items, noWrap = false }: KeyValueListProps): JSX.Element => {
  return (
    <Box component="dl" className={css.list} mod={{ 'no-wrap': noWrap }}>
      {items.filter(Boolean).map((item, index) => {
        const { label, value, hiddenFrom } = item as Item;
        return (
          <Box key={index} className={css.item} hiddenFrom={hiddenFrom}>
            <dt className={css.label}>{label}</dt>
            <dd className={css.value}>{value}</dd>
          </Box>
        );
      })}
    </Box>
  );
};
