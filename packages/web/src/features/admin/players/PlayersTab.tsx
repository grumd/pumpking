import { Anchor, Badge, Button, Group, Stack, Table, Text, TextInput, rem } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { FaPlus, FaSearch } from 'react-icons/fa';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { Flag } from 'components/Flag/Flag';
import Loader from 'components/Loader/Loader';

import { routes } from 'constants/routes';

import { api } from 'utils/trpc';

import { DetailDrawer } from '../components/DetailDrawer';
import { MIX_OPTIONS_WITH_ARCADE_NAMES } from '../scoring';
import { PlayerDetail } from './PlayerDetail';

const LIMIT = 200;

// All players, filtered by nickname or arcade name (kept in the URL as ?q=)
export const PlayersTab = (): JSX.Element => {
  const navigate = useNavigate();
  const params = useParams();
  const openId = params.id === 'new' ? 'new' : params.id ? Number(params.id) : null;
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get('q') ?? '';

  const players = useQuery(api.admin.players.list.queryOptions());
  const pattern = filter.trim().toLowerCase();
  const matching = (players.data ?? []).filter(
    (player) =>
      !pattern ||
      String(player.id) === pattern ||
      [player.nickname, ...Object.values(player.arcadeNames).map((name) => name?.name)].some(
        (name) => name?.toLowerCase().includes(pattern)
      )
  );
  const nicknames = new Map(players.data?.map((player) => [player.id, player.nickname]));
  const listPath = { pathname: routes.admin.players.path, search: searchParams.toString() };

  return (
    <Stack gap="sm">
      <Group wrap="wrap" gap="xs">
        <TextInput
          placeholder="Filter by nickname or arcade name"
          aria-label="Filter players"
          leftSection={<FaSearch />}
          value={filter}
          onChange={(event) =>
            setSearchParams(event.currentTarget.value ? { q: event.currentTarget.value } : {}, {
              replace: true,
            })
          }
          flex={1}
          miw={rem(200)}
        />
        <Text size="sm" c="dimmed">
          {players.data && `${matching.length} of ${players.data.length} players`}
        </Text>
        <Button
          leftSection={<FaPlus />}
          onClick={() =>
            navigate({
              pathname: routes.admin.players.getPath({ id: 'new' }),
              search: listPath.search,
            })
          }
        >
          New player
        </Button>
      </Group>

      {players.isLoading && <Loader />}
      {players.data && (
        <Table.ScrollContainer minWidth={820}>
          <Table highlightOnHover verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>#</Table.Th>
                <Table.Th>Nickname</Table.Th>
                {MIX_OPTIONS_WITH_ARCADE_NAMES.map((mix) => (
                  <Table.Th key={mix.id}>{mix.name}</Table.Th>
                ))}
                <Table.Th>Region</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {matching.slice(0, LIMIT).map((player) => {
                const detailPath = {
                  pathname: routes.admin.players.getPath({ id: player.id }),
                  search: listPath.search,
                };
                return (
                  <Table.Tr
                    key={player.id}
                    onClick={() => navigate(detailPath)}
                    data-clickable
                    data-selected={player.id === openId || undefined}
                  >
                    <Table.Td>
                      <Anchor
                        inherit
                        component={Link}
                        to={detailPath}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {player.id}
                      </Anchor>
                    </Table.Td>
                    <Table.Td>{player.nickname}</Table.Td>
                    {MIX_OPTIONS_WITH_ARCADE_NAMES.map((mix) => (
                      <Table.Td key={mix.id} ff="monospace" fz="sm">
                        {player.arcadeNames[mix.id]?.name}
                      </Table.Td>
                    ))}
                    <Table.Td>
                      {player.region && <Flag region={player.region} size="sm" />}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xxs">
                        {player.hidden && (
                          <Badge color="gray" size="sm">
                            hidden
                          </Badge>
                        )}
                        {player.is_admin && (
                          <Badge color="grape" size="sm">
                            admin
                          </Badge>
                        )}
                        {player.can_add_results_manually && (
                          <Badge color="teal" size="sm">
                            adds results
                          </Badge>
                        )}
                        {player.discard_results && (
                          <Badge color="red" size="sm">
                            discarded
                          </Badge>
                        )}
                        {player.actual_player_id && (
                          <Badge color="blue" size="sm">
                            alias of{' '}
                            {nicknames.get(player.actual_player_id) ??
                              `#${player.actual_player_id}`}
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
      {matching.length > LIMIT && (
        <Text size="sm" c="dimmed" ta="center">
          Showing {LIMIT} of {matching.length}: filter to find the others
        </Text>
      )}

      <DetailDrawer
        opened={openId != null}
        onClose={() => navigate(listPath)}
        title={openId === 'new' ? 'New player' : `Player #${openId}`}
      >
        {openId != null && (
          <PlayerDetail
            key={openId}
            id={openId}
            onCreated={(id) =>
              navigate({ pathname: routes.admin.players.getPath({ id }), search: listPath.search })
            }
          />
        )}
      </DetailDrawer>
    </Stack>
  );
};
