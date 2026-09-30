import type { AdminFileKind, AdminFileSource } from '@/api/services/admin/files';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import cookies from 'browser-cookies';

export const ADMIN_FILE_KEY = 'adminFile';

export interface AdminFile {
  fileName: string;
  blob: Blob;
}

// Admin files are sent by a REST route, since tRPC doesn't send binary files. A link
// can't send the session header, so the file is fetched here and shown from a blob
const fetchAdminFile = async (
  source: AdminFileSource,
  id: number,
  kind: AdminFileKind
): Promise<AdminFile> => {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_PATH}/admin/files/${source}/${id}/${kind}`,
    { headers: { session: cookies.get('session') ?? '' } }
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `${response.status} ${response.statusText}`);
  }

  const fileName =
    response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ??
    `${source}-${id}-${kind}`;

  return { fileName, blob: await response.blob() };
};

export const useAdminFile = (
  source: AdminFileSource,
  id: number,
  kind: AdminFileKind
): UseQueryResult<AdminFile, Error> => {
  return useQuery({
    queryKey: [ADMIN_FILE_KEY, source, id, kind],
    queryFn: () => fetchAdminFile(source, id, kind),
    // A missing file stays missing
    retry: false,
  });
};
