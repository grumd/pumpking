import crypto from 'crypto';
import { mix as currentMix } from '@pumpking/core/constants/currentMix';
import { db } from '@pumpking/core/db';
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

  // Create the player, with their arcade name on the current mix
  const playerId = await db.transaction().execute(async (trx) => {
    const result = await trx
      .insertInto('players')
      .values({ nickname, email, region })
      .executeTakeFirstOrThrow();
    const id = Number(result.insertId);

    if (arcadeName) {
      await trx
        .insertInto('arcade_player_names')
        .values({
          mix_id: currentMix,
          player_id: id,
          name: arcadeName.toUpperCase(),
          name_edist: 1,
        })
        .execute();
    }
    return id;
  });

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
