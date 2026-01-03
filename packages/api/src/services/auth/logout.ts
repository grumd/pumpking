import { db } from 'db';
import createDebug from 'debug';

const debug = createDebug('backend-ts:auth');

export async function logout(sessionId: string): Promise<void> {
  debug(`Logging out session: ${sessionId.substring(0, 8)}...`);

  await db.deleteFrom('sessions').where('id', '=', sessionId).execute();

  debug('Session deleted');
}
