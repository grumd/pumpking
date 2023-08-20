import { api } from 'utils/trpc';

export const useUser = () => {
  return api.user.useQuery();
};
