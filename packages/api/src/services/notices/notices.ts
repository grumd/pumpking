import { db, type Transaction } from 'db';
import { sql } from 'kysely';

export const NOTICE_SCOPES = ['tournament'] as const;
export type NoticeScope = (typeof NOTICE_SCOPES)[number];

// One pending notice per player and scope: a new event re-points an existing row.
export const raiseNotices = async (
  trx: Transaction,
  scope: NoticeScope,
  refId: number,
  playerIds: number[]
) => {
  if (!playerIds.length) {
    return;
  }
  const now = new Date();
  await trx
    .insertInto('player_notices')
    .values(
      playerIds.map((playerId) => ({
        player_id: playerId,
        scope,
        ref_id: refId,
        created_at: now,
        read_at: null,
      }))
    )
    .onDuplicateKeyUpdate({
      // assigned left to right: created_at must see the old read_at
      created_at: sql`if(read_at is null, created_at, values(created_at))`,
      ref_id: sql`values(ref_id)`,
      read_at: null,
    })
    .execute();
};

export const getUnreadNotices = async (playerId?: number) => {
  const rows = playerId
    ? await db
        .selectFrom('player_notices')
        .select('scope')
        .where('player_id', '=', playerId)
        .where('read_at', 'is', null)
        .execute()
    : [];
  return Object.fromEntries(rows.map((row) => [row.scope, true])) as Partial<
    Record<NoticeScope, boolean>
  >;
};

export const markNoticesRead = async (playerId: number, scope: NoticeScope) => {
  await db
    .updateTable('player_notices')
    .set({ read_at: new Date() })
    .where('player_id', '=', playerId)
    .where('scope', '=', scope)
    .where('read_at', 'is', null)
    .execute();
  return getUnreadNotices(playerId);
};
