import { db } from '@pumpking/database/db';
import crypto from 'crypto';
import createDebug from 'debug';

const debug = createDebug('backend-ts:auth');

function generateSessionId(): string {
  return crypto.randomBytes(16).toString('hex');
}

export async function devLogin(playerId: number): Promise<{ session: string }> {
  debug(`Dev login for player ID: ${playerId}`);

  const player = await db
    .selectFrom('players')
    .select(['id', 'nickname'])
    .where('id', '=', playerId)
    .executeTakeFirst();

  if (!player) {
    throw new Error(`Player with ID ${playerId} not found`);
  }

  debug(`Found player: ${player.nickname} (${player.id})`);

  await db.deleteFrom('sessions').where('player', '=', player.id).execute();

  const now = new Date();
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

  debug(`Created dev session for player ${player.id}`);

  return { session: sessionId };
}
