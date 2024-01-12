import { api } from 'utils/trpc';

export const usePlayerPpHistory = ({ playerId }: { playerId: number | undefined }) => {
  return api.players.pp.useQuery(playerId);
};
