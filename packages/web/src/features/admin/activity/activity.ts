import { notifications } from '@mantine/notifications';
import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { atom, useAtomValue, useSetAtom } from 'jotai';

// The admin activity log: what each admin action did, as the desktop tool's log panel
// showed. Kept for the browser session

export interface ActivityEntry {
  id: number;
  at: Date;
  title: string;
  ok: boolean;
  // The action's report lines, or its error
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

/**
 * A mutation for an admin action: its outcome (the report lines, or the error) goes to
 * the activity log and a notification, and every query is refetched afterwards, since
 * an admin change can show up anywhere (leaderboards, rankings, the admin lists)
 */
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
      queryClient.invalidateQueries();
      options.onSuccess?.(...args);
    },
    onError: (...args) => {
      const [error, variables] = args;
      logActivity({ title: title(variables), ok: false, lines: [error.message] });
      options.onError?.(...args);
    },
  });
};
