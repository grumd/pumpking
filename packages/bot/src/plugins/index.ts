import type { BotConfig } from '../env';
import type { Plugin } from '../platform/types';
import { accountPlugin } from './account';
import { createHealthPlugin } from './health';
import { createKasaPlugin } from './kasa';
import { locationsPlugin } from './locations';
import { rivalsPlugin } from './rivals';
import { tournamentsPlugin } from './tournaments';

// The enabled plugins; the optional ones need their settings in packages/bot/.env
export const createPlugins = (config: BotConfig): Plugin[] => [
  accountPlugin,
  rivalsPlugin,
  locationsPlugin,
  ...(config.tournamentsChannelId ? [tournamentsPlugin] : []),
  ...(config.kasa ? [createKasaPlugin()] : []),
  ...(config.healthChecks.length > 0 ? [createHealthPlugin()] : []),
];
