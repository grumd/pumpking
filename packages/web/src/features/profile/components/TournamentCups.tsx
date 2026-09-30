import { Box, Table } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import _ from 'lodash/fp';
import { useParams } from 'react-router';

import { Card } from 'components/Card/Card';
import { Medal, MedalCounts } from 'components/Medal/Medal';

import { tournamentName } from 'features/tournaments/tournamentName';

import { useLanguage } from 'utils/context/translation';
import { api } from 'utils/trpc';

export const TournamentCups = () => {
  const lang = useLanguage();
  const params = useParams();
  const { data: awards } = useQuery(
    api.tournaments.awards.queryOptions({ playerId: Number(params.id) })
  );

  if (!awards?.length) {
    return null;
  }

  const counts = _.countBy('medal', awards);

  return (
    <Card
      title={lang.TOURNAMENT_CUPS}
      headerNode={
        <Box fz="lg">
          <MedalCounts
            cups={{
              gold: counts.gold ?? 0,
              silver: counts.silver ?? 0,
              bronze: counts.bronze ?? 0,
            }}
          />
        </Box>
      }
    >
      <Table>
        <Table.Tbody>
          {awards.map((award) => (
            <Table.Tr key={award.tournamentId}>
              <Table.Td w="1%">{award.medal && <Medal medal={award.medal} />}</Table.Td>
              <Table.Td>{tournamentName(award.startDate)}</Table.Td>
              <Table.Td>{lang.TOURNAMENT_BRACKET(award.bracketCode)}</Table.Td>
              <Table.Td ta="right" c="dimmed">
                #{award.rank} · {award.score.toLocaleString('en-US')}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Card>
  );
};
