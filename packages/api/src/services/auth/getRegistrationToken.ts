import { db } from 'db';
import createDebug from 'debug';
import { OAuth2Client } from 'google-auth-library';
import { StatusError } from 'utils/errors';
import { createRegistrationToken } from './googleLogin';

const debug = createDebug('backend-ts:auth');

const GOOGLE_CLIENT_ID = '197132042723-cmibep21qf6dald9l2l01rif7l5dtd4s.apps.googleusercontent.com';

const oauth2Client = new OAuth2Client(GOOGLE_CLIENT_ID);

export async function getRegistrationToken(
  credential: string
): Promise<{ email: string; registrationToken: string }> {
  const ticket = await oauth2Client.verifyIdToken({
    idToken: credential,
    audience: GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload) {
    throw new StatusError(401, 'Invalid token payload');
  }

  const email = payload.email;
  if (!email) {
    throw new StatusError(400, 'No email in token');
  }

  debug(`Registration token request for email: ${email}`);

  const existingPlayer = await db
    .selectFrom('players')
    .select(['id'])
    .where('email', '=', email)
    .executeTakeFirst();

  if (existingPlayer) {
    throw new StatusError(409, 'An account with this email already exists. Please login instead.');
  }

  const token = createRegistrationToken(email);
  return {
    email: token.email,
    registrationToken: token.token,
  };
}
