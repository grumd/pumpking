import { db } from '@pumpking/database/db';

/**
 * The bot preferences of a player, `players.telegram_bot_preferences`. The JSON is
 * versioned like in the legacy bot: `version` counts the updaters below that have run, so
 * the stored preferences keep working. Add an updater to change the shape.
 */

export interface RivalsPreferences {
  // Player ids
  list: number[];
  // Chart levels [from, to] to be notified about
  levels: [number, number];
  track: boolean;
  // "Smart" tracking: also players who aren't on the list
  trackInferior: boolean;
}

export interface BotPreferences {
  version: number;
  rivals: RivalsPreferences;
}

type StoredPreferences = Record<string, any>;

const updaters: ((prefs: StoredPreferences) => void)[] = [
  (prefs) => {
    if (prefs.rivals == null) {
      prefs.rivals = { list: [], levels: [0, 99], track: true };
    }
  },
  (prefs) => {
    prefs.rivals.trackInferior = true;
  },
];

export const migratePreferences = (stored: object | null): BotPreferences => {
  const prefs: StoredPreferences = structuredClone(stored ?? {});
  for (let version = prefs.version ?? 0; version < updaters.length; version++) {
    updaters[version](prefs);
  }
  prefs.version = updaters.length;
  return prefs as BotPreferences;
};

export class NotRegisteredError extends Error {
  constructor() {
    super("I don't know you yet: write <code>hi</code> to link your Telegram to your player");
  }
}

/** The preferences of the player linked to a chat; throws a NotRegisteredError if none is */
export const getPreferences = async (telegramId: number): Promise<BotPreferences> => {
  const player = await db
    .selectFrom('players')
    .select('telegram_bot_preferences')
    .where('telegram_id', '=', telegramId)
    .executeTakeFirst();
  if (!player) {
    throw new NotRegisteredError();
  }
  return migratePreferences(player.telegram_bot_preferences as object | null);
};

export const savePreferences = async (telegramId: number, prefs: BotPreferences) => {
  await db
    .updateTable('players')
    .set({ telegram_bot_preferences: JSON.stringify(prefs) })
    .where('telegram_id', '=', telegramId)
    .execute();
};
