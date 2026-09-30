import type { Response } from 'supertest';
import { req } from 'test/helpers';
import { adminSession } from 'test/helpers/sessions';

// Calls a tRPC procedure over HTTP the way the web client does (superjson's `json`
// envelope), as an admin unless another session is given

export const trpcQuery = (path: string, input?: unknown, session: string | null = adminSession) => {
  const request = req()
    .get(`/trpc/${path}`)
    .query({ input: JSON.stringify({ json: input }) });
  return session ? request.set('session', session) : request;
};

export const trpcMutation = (
  path: string,
  input?: unknown,
  session: string | null = adminSession
) => {
  const request = req().post(`/trpc/${path}`).send({ json: input });
  return session ? request.set('session', session) : request;
};

// The procedure's output (dates come as ISO strings)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const output = (res: Response): any => res.body.result.data.json;

export const errorMessage = (res: Response): string => res.body.error.json.message;
