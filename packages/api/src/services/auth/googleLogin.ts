import crypto from 'crypto';
import { db } from 'db';
import createDebug from 'debug';
import { OAuth2Client } from 'google-auth-library';
import { StatusError } from 'utils/errors';

const debug = createDebug('backend-ts:auth');

// Public client ID, safe to expose
const GOOGLE_CLIENT_ID = '197132042723-cmibep21qf6dald9l2l01rif7l5dtd4s.apps.googleusercontent.com';

const oauth2Client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Secret for signing registration tokens - in production this should be in env vars
const REGISTRATION_SECRET = process.env.REGISTRATION_SECRET || 'pumpking-registration-secret-key';

export interface RegistrationToken {
  email: string;
  token: string;
}

export function createRegistrationToken(email: string): RegistrationToken {
  const expires = Date.now() + 10 * 60 * 1000; // 10 minutes
  const data = `${email}:${expires}`;
  const signature = crypto.createHmac('sha256', REGISTRATION_SECRET).update(data).digest('hex');
  const token = Buffer.from(`${data}:${signature}`).toString('base64');
  return { email, token };
}

export function verifyRegistrationToken(token: string): string {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [email, expiresStr, signature] = decoded.split(':');
    const expires = parseInt(expiresStr, 10);

    if (Date.now() > expires) {
      throw new StatusError(400, 'Registration token has expired');
    }

    const expectedSignature = crypto
      .createHmac('sha256', REGISTRATION_SECRET)
      .update(`${email}:${expiresStr}`)
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new StatusError(400, 'Invalid registration token');
    }

    return email;
  } catch (e) {
    if (e instanceof StatusError) throw e;
    throw new StatusError(400, 'Invalid registration token format');
  }
}

function generateSessionId(): string {
  return crypto.randomBytes(16).toString('hex');
}

export async function loginWithGoogleCredential(credential: string): Promise<{ session: string }> {
  // Verify the credential (JWT ID token) from Google One Tap
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

  debug(`Login attempt for email: ${email}`);

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
