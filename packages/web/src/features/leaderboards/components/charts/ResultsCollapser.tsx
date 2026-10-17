import { Table, UnstyledButton } from '@mantine/core';
import { useState } from 'react';

import { useLanguage } from 'utils/context/translation';

import css from './chart-results.module.css';

interface ResultsCollapserProps {
  children: React.ReactNode;
  count: number;
  // All the table's columns: more would add empty columns that take room from the names
  colSpan: number;
}

// Hides a group of results behind a "show N more" row
export const ResultsCollapser = ({
  children,
  count,
  colSpan,
}: ResultsCollapserProps): JSX.Element => {
  const [collapsed, setCollapsed] = useState(true);
  const lang = useLanguage();

  if (collapsed && count > 1) {
    return (
      <Table.Tr>
        <Table.Td colSpan={colSpan} p={0}>
          <UnstyledButton
            className={css.collapser}
            w="100%"
            py="xxs"
            ta="center"
            c="dimmed"
            fz="xs"
            onClick={() => setCollapsed(false)}
          >
            {lang.SHOW_MORE_RESULTS(count)}
          </UnstyledButton>
        </Table.Td>
      </Table.Tr>
    );
  }

  return <>{children}</>;
};
