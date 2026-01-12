import { db } from 'db';
import createDebug from 'debug';
import { StatusError } from 'utils/errors';
import { generateSessionId } from 'utils/session';
import { createRegistrationToken } from './googleLogin';

const debug = createDebug('backend-ts:auth');

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  email?: string;
  verified?: boolean;
}

async function exchangeCodeForToken(code: string, redirectUri: string): Promise<DiscordTokenResponse> {
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    throw new StatusError(500, 'Discord OAuth is not configured');
  }

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    client_secret: DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    debug(`Discord token exchange failed: ${error}`);
    throw new StatusError(401, 'Failed to exchange Discord authorization code');
  }

  return response.json() as Promise<DiscordTokenResponse>;
}

async function getDiscordUser(accessToken: string): Promise<DiscordUser> {
  const response = await fetch('https://discord.com/api/users/@me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new StatusError(401, 'Failed to get Discord user info');
  }

  return response.json() as Promise<DiscordUser>;
}

export async function loginWithDiscordCode(
  code: string,
  redirectUri: string
): Promise<{ session: string }> {
  const tokenData = await exchangeCodeForToken(code, redirectUri);
  const discordUser = await getDiscordUser(tokenData.access_token);

  if (!discordUser.email) {
    throw new StatusError(400, 'No email associated with Discord account. Please use an account with a verified email.');
  }

  if (!discordUser.verified) {
    throw new StatusError(400, 'Discord email is not verified');
  }

  const email = discordUser.email;
  debug(`Discord login attempt for email: ${email}`);

  // Find player by email
  const player = await db
    .selectFrom('players')
    .select(['id', 'nickname'])
    .where('email', '=', email)
    .executeTakeFirst();

  if (!player) {
    throw new StatusError(403, 'Player with specified email not found');
  }

  debug(`Found player: ${player.nickname} (${player.id})`);

  // Check for existing valid session
  const now = new Date();
  const existingSession = await db
    .selectFrom('sessions')
    .select(['id', 'valid_until'])
    .where('player', '=', player.id)
    .where('valid_until', '>', now)
    .executeTakeFirst();

  if (existingSession) {
    debug(`Recalled existing session for player ${player.id}`);
    return { session: existingSession.id };
  }

  // Delete old sessions for this player
  await db.deleteFrom('sessions').where('player', '=', player.id).execute();

  // Create new session (valid for 2 weeks)
  const sessionId = generateSessionId();
  const validUntil = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  await db
    .insertInto('sessions')
    .values({
      id: sessionId,
      player: player.id,
      established: now,
      valid_until: validUntil,
    })
    .execute();

  debug(`Created new session for player ${player.id}`);

  return { session: sessionId };
}

export async function getDiscordRegistrationToken(
  code: string,
  redirectUri: string
): Promise<{ email: string; registrationToken: string }> {
  const tokenData = await exchangeCodeForToken(code, redirectUri);
  const discordUser = await getDiscordUser(tokenData.access_token);

  if (!discordUser.email) {
    throw new StatusError(400, 'No email associated with Discord account. Please use an account with a verified email.');
  }

  if (!discordUser.verified) {
    throw new StatusError(400, 'Discord email is not verified');
  }

  const email = discordUser.email;
  debug(`Discord registration token request for email: ${email}`);

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
