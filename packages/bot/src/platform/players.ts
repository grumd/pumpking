import { migratePreferences, type BotPreferences } from './preferences';
import { db } from '@pumpking/core/db';
import { sql } from 'kysely';

// The players the bot knows about: the visible ones, like the legacy /telegram/players

export interface BotPlayer {
  id: number;
  nickname: string;
  // RU / UA get their own texts
  region: string | null;
  pp: number;
  telegramId: number | null;
  telegramTag: string | null;
  // Null for players who never set anything; they get no rivals notifications
  preferences: BotPreferences | null;
}

const visiblePlayers = () =>
  db
    .selectFrom('players')
    .select([
      'id',
      'nickname',
      'region',
      'pp',
      'telegram_id',
      'telegram_tag',
      'telegram_bot_preferences',
    ])
    .where('hidden', '=', 0);

interface PlayerRow {
  id: number;
  nickname: string;
  region: string | null;
  pp: number | null;
  telegram_id: number | null;
  telegram_tag: string | null;
  telegram_bot_preferences: unknown;
}

const toBotPlayer = (row: PlayerRow): BotPlayer => ({
  id: row.id,
  nickname: row.nickname,
  region: row.region,
  pp: row.pp ?? 0,
  telegramId: row.telegram_id,
  telegramTag: row.telegram_tag,
  preferences:
    row.telegram_bot_preferences == null
      ? null
      : migratePreferences(row.telegram_bot_preferences as object),
});

export const getVisiblePlayers = async (ids?: number[]): Promise<BotPlayer[]> => {
  if (ids && ids.length === 0) {
    return [];
  }
  let query = visiblePlayers();
  if (ids) {
    query = query.where('id', 'in', ids);
  }
  return (await query.execute()).map(toBotPlayer);
};

/** The visible player linked to a chat */
export const findLinkedPlayer = async (telegramId: number): Promise<BotPlayer | undefined> => {
  const row = await visiblePlayers().where('telegram_id', '=', telegramId).executeTakeFirst();
  return row && toBotPlayer(row);
};

/** A visible player by nickname, ignoring case */
export const findPlayerByNickname = async (nickname: string): Promise<BotPlayer | undefined> => {
  const row = await visiblePlayers()
    .where(sql`lower(nickname)`, '=', nickname.toLowerCase())
    .executeTakeFirst();
  return row && toBotPlayer(row);
};

export const languageOf = (player: BotPlayer | undefined) => player?.region ?? 'EN';
