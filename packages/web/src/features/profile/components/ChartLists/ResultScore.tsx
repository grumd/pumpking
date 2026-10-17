import { Table, rem } from '@mantine/core';

import { Grade } from 'components/Grade/Grade';

// The Phoenix score and its grade, a column each
export const ResultScore = ({
  score,
  isPass,
}: {
  score: number | null;
  isPass: boolean;
}): JSX.Element => (
  <>
    <Table.Td data-fit visibleFrom="xs" ta="right" fz="sm">
      {score?.toLocaleString('en-US')}
    </Table.Td>
    <Table.Td data-fit>
      <Grade h={rem(18)} w={rem(44)} score={score ?? 0} isPass={isPass} />
    </Table.Td>
  </>
);
