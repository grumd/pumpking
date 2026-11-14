import type { BotConfig } from '../env';
import type { Plugin } from '../platform/types';
import { accountPlugin } from './account';
import { createHealthPlugin } from './health';
import { createKasaPlugin } from './kasa';
import { locationsPlugin } from './locations';
import { photoLimitsPlugin } from './photoLimits';
import { rivalsPlugin } from './rivals';
import { tournamentsPlugin } from './tournaments';

export const createPlugins = (config: BotConfig): Plugin[] => [
  accountPlugin,
  rivalsPlugin,
  locationsPlugin,
  photoLimitsPlugin,
  ...(config.tournamentsChannelId ? [tournamentsPlugin] : []),
  ...(config.kasa ? [createKasaPlugin()] : []),
  ...(config.healthChecks.length > 0 ? [createHealthPlugin()] : []),
];
