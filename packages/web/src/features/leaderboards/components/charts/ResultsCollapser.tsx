import { Table, UnstyledButton } from '@mantine/core';
import { useState } from 'react';
import { BsArrowsExpand } from 'react-icons/bs';

import { useLanguage } from 'utils/context/translation';

import css from './chart-results.module.css';

interface ResultsCollapserProps {
  children: React.ReactNode;
  count: number;
}

// Hides a group of results behind a "show N more" row
export const ResultsCollapser = ({ children, count }: ResultsCollapserProps): JSX.Element => {
  const [collapsed, setCollapsed] = useState(true);
  const lang = useLanguage();

  if (collapsed && count > 1) {
    return (
      <Table.Tr>
        <Table.Td colSpan={20} p={0}>
          <UnstyledButton
            className={css.collapser}
            w="100%"
            py="xxs"
            ta="center"
            c="dimmed"
            fz="xs"
            onClick={() => setCollapsed(false)}
          >
            {count && lang.SHOW_MORE_RESULTS ? lang.SHOW_MORE_RESULTS(count) : <BsArrowsExpand />}
          </UnstyledButton>
        </Table.Td>
      </Table.Tr>
    );
  }

  return <>{children}</>;
};
