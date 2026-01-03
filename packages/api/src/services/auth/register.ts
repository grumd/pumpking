import crypto from 'crypto';
import { db } from 'db';
import createDebug from 'debug';
import { StatusError } from 'utils/errors';
import { verifyRegistrationToken } from './googleLogin';

const debug = createDebug('backend-ts:auth');

function generateSessionId(): string {
  return crypto.randomBytes(16).toString('hex');
}

export interface RegisterInput {
  registrationToken: string;
  nickname: string;
  region: string | null;
  arcadeName: string | null;
}

export async function registerPlayer(input: RegisterInput): Promise<{ session: string }> {
  const { registrationToken, nickname, region, arcadeName } = input;

  // Verify the registration token and extract email
  const email = verifyRegistrationToken(registrationToken);

  debug(`Registration attempt for email: ${email}, nickname: ${nickname}`);

  // Check if player with this email already exists (race condition check)
  const existingPlayer = await db
    .selectFrom('players')
    .select(['id'])
    .where('email', '=', email)
    .executeTakeFirst();

  if (existingPlayer) {
    throw new StatusError(409, 'Player with this email already exists');
  }

  // Check if nickname is already taken
  const existingNickname = await db
    .selectFrom('players')
    .select(['id'])
    .where('nickname', '=', nickname)
    .executeTakeFirst();

  if (existingNickname) {
    throw new StatusError(409, 'This nickname is already taken');
  }

  // Create new player
  const result = await db
    .insertInto('players')
    .values({
      nickname,
      email,
      region,
      arcade_phoenix_name: arcadeName,
    })
    .executeTakeFirst();

  const playerId = Number(result.insertId);

  debug(`Created new player: ${nickname} (${playerId})`);

  // Create session for the new player
  const now = new Date();
  const sessionId = generateSessionId();
  const validUntil = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  await db
    .insertInto('sessions')
    .values({
      id: sessionId,
      player: playerId,
      established: now,
      valid_until: validUntil,
    })
    .execute();

  debug(`Created session for new player ${playerId}`);

  return { session: sessionId };
}
