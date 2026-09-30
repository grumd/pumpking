import { Select } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';

import { api } from 'utils/trpc';

interface PlayerSelectProps {
  label?: string;
  value: number | null;
  onChange: (playerId: number | null) => void;
  placeholder?: string;
  description?: React.ReactNode;
  // E.g. the player being edited, who can't be their own alias
  excludeId?: number;
  w?: string;
}

// Picks a player by nickname (all players, hidden ones too)
export const PlayerSelect = ({
  label,
  value,
  onChange,
  placeholder,
  description,
  excludeId,
  w,
}: PlayerSelectProps): JSX.Element => {
  const players = useQuery(api.admin.players.list.queryOptions());
  const data = (players.data ?? [])
    .filter((player) => player.id !== excludeId)
    .map((player) => ({ value: String(player.id), label: `${player.nickname} (#${player.id})` }));

  return (
    <Select
      label={label}
      value={value == null ? null : String(value)}
      onChange={(next) => onChange(next ? Number(next) : null)}
      data={data}
      searchable
      clearable
      placeholder={players.isLoading ? 'Loading players…' : placeholder}
      description={description}
      nothingFoundMessage="No such player"
      w={w}
    />
  );
};
