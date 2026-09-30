import dotenv from 'dotenv';
import path from 'path';

// The service's own settings (packages/bot/.env). The DB config comes from core's .env.
// Variables already set in the environment win; the file may be missing
dotenv.config({ path: path.join(__dirname, '../.env') });

const optional = (name: string) => process.env[name] || undefined;

const optionalNumber = (name: string) => {
  const value = optional(name);
  return value === undefined ? undefined : Number(value);
};

export interface BotConfig {
  // The Telegram part starts only when this is set
  telegramToken?: string;
  // The admin's chat id and Telegram username: errors go to the admin, and admin-only
  // commands check the username
  adminId?: number;
  adminNickname?: string;
  // Channel for the tournament start / end posts
  tournamentsChannelId?: number;
  // Watchers of one location get told when it starts, stalls, resumes, or a player shows up
  trackedLocationName?: string;
  trackedLocationWatchers: number[];
  // A TP-Link Kasa plug (the heater) whose on / off the admin gets told about
  kasa?: { login: string; password: string; device: string };
  // Services whose /healthz the bot watches, telling the admin when one goes down
  healthChecks: { name: string; url: string }[];
}

export const readConfig = (): BotConfig => {
  const kasaLogin = optional('TRACKED_KASA_LOGIN');
  const kasaPassword = optional('TRACKED_KASA_PASSWORD');
  const kasaDevice = optional('TRACKED_KASA_DEVICE');
  const ingestHealthUrl = optional('INGEST_HEALTH_URL');
  const apiHealthUrl = optional('API_HEALTH_URL');

  return {
    telegramToken: optional('TELEGRAM_BOT_TOKEN')?.trim(),
    adminId: optionalNumber('TELEGRAM_ADMIN_ID'),
    adminNickname: optional('TELEGRAM_ADMIN_NICKNAME'),
    tournamentsChannelId: optionalNumber('TOURNAMENTS_CHANNEL_ID'),
    trackedLocationName: optional('TRACKED_LOCATION_NAME'),
    trackedLocationWatchers: (optional('TRACKED_LOCATION_REPORT_TO_USERS') ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map(Number),
    kasa:
      kasaLogin && kasaPassword && kasaDevice
        ? { login: kasaLogin, password: kasaPassword, device: kasaDevice }
        : undefined,
    healthChecks: [
      ...(ingestHealthUrl ? [{ name: 'Ingestion', url: ingestHealthUrl }] : []),
      ...(apiHealthUrl ? [{ name: 'API', url: apiHealthUrl }] : []),
    ],
  };
};
