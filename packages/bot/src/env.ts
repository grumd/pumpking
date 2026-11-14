import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const optional = (name: string) => process.env[name] || undefined;

const optionalNumber = (name: string) => {
  const value = optional(name);
  return value === undefined ? undefined : Number(value);
};

export interface BotConfig {
  telegramToken?: string;
  adminId?: number;
  adminNickname?: string;
  tournamentsChannelId?: number;
  trackedLocationName?: string;
  trackedLocationWatchers: number[];
  kasa?: { login: string; password: string; device: string };
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
