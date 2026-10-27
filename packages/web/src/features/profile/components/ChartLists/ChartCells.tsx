import { Anchor, Table } from '@mantine/core';
import { NavLink } from 'react-router-dom';

import { ChartLabel } from 'components/ChartLabel/ChartLabel';

import { routes } from 'constants/routes';

// The chart's label, its difficulty (what its pp is based on) and the song, a column each
export const ChartCells = ({
  sharedChartId,
  label,
  difficulty,
  name,
}: {
  sharedChartId: number;
  label: string;
  difficulty: number | null;
  name: string;
}): JSX.Element => (
  <>
    <Table.Td data-fit>
      <ChartLabel label={label} />
    </Table.Td>
    <Table.Td data-fit ps={0} fz="sm" c="dimmed">
      {difficulty ? `(${difficulty.toFixed(1)})` : ''}
    </Table.Td>
    <Table.Td>
      <Anchor component={NavLink} to={routes.leaderboard.sharedChart.getPath({ sharedChartId })}>
        {name}
      </Anchor>
    </Table.Td>
  </>
);
