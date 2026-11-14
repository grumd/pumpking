import { notifications } from '@mantine/notifications';
import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { atom, useAtomValue, useSetAtom } from 'jotai';

import { ADMIN_FILE_KEY } from '../hooks/useAdminFile';

export interface ActivityEntry {
  id: number;
  at: Date;
  title: string;
  ok: boolean;
  lines: string[];
}

const activityAtom = atom<ActivityEntry[]>([]);
let nextId = 1;

export const useActivity = () => useAtomValue(activityAtom);

const useLogActivity = () => {
  const setActivity = useSetAtom(activityAtom);
  return (entry: Omit<ActivityEntry, 'id' | 'at'>) => {
    setActivity((entries) =>
      [{ ...entry, id: nextId++, at: new Date() }, ...entries].slice(0, 200)
    );
    notifications.show({
      color: entry.ok ? 'teal' : 'red',
      title: entry.title,
      message:
        entry.lines.length > 1
          ? `${entry.lines[0]} (+${entry.lines.length - 1} more in the activity log)`
          : entry.lines[0],
      autoClose: entry.ok ? 4000 : 10000,
    });
  };
};

export const useAdminAction = <
  TData extends { report?: string[] },
  TError extends { message: string },
  TVariables
>(
  options: UseMutationOptions<TData, TError, TVariables>,
  title: (variables: TVariables) => string
) => {
  const logActivity = useLogActivity();
  const queryClient = useQueryClient();

  return useMutation<TData, TError, TVariables>({
    ...options,
    onSuccess: (...args) => {
      const [data, variables] = args;
      logActivity({ title: title(variables), ok: true, lines: data.report ?? [] });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== ADMIN_FILE_KEY });
      options.onSuccess?.(...args);
    },
    onError: (...args) => {
      const [error, variables] = args;
      logActivity({ title: title(variables), ok: false, lines: [error.message] });
      options.onError?.(...args);
    },
  });
};
