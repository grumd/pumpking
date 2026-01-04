import { Select } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import cookies from 'browser-cookies';
import { useState } from 'react';

import { api } from 'utils/trpc';

export function DevLogin() {
  if (!import.meta.env.DEV) {
    return null;
  }

  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const playersQuery = useQuery(api.players.list.queryOptions({}));

  const devLoginMutation = useMutation(
    api.auth.devLogin.mutationOptions({
      onSuccess: (data) => {
        cookies.set('session', data.session, { expires: 14 });
        queryClient.invalidateQueries(api.user.current.queryFilter());
      },
      onError: (err) => {
        console.error('Dev login error:', err);
        setError(err.message);
      },
    })
  );

  const players = playersQuery.data ?? [];
  const selectData = players.map((player) => ({
    value: String(player.id),
    label: player.nickname,
  }));

  const handleChange = (value: string | null) => {
    if (value) {
      setError(null);
      devLoginMutation.mutate({ playerId: Number(value) });
    }
  };

  return (
    <div className="dev-login">
      <Select
        placeholder="Dev login as..."
        data={selectData}
        onChange={handleChange}
        searchable
        disabled={devLoginMutation.isPending}
        styles={{
          root: { width: 200 },
        }}
      />
      {error && <div className="error">{error}</div>}
    </div>
  );
}
