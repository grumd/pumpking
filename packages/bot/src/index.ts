import { app } from './app';
import { readConfig } from './env';
import { createPlatform } from './platform/platform';
import { createTelegramSender, startTelegram } from './platform/telegram';
import { createPlugins } from './plugins';
import { Bot } from 'grammy';

const port = Number(process.env.APP_PORT) || 3003;

// Only reachable from the host itself: it has no firewall, and the bot needs no inbound traffic
app.listen(port, '127.0.0.1', () => console.log(`Listening on port ${port}`));

// Without a token only /healthz runs. A token allows a single long-polling bot, so it's
// set only once the legacy Python bot (which uses the same one) is stopped
const config = readConfig();
if (config.telegramToken) {
  const telegram = new Bot(config.telegramToken);
  const platform = createPlatform(
    createPlugins(config),
    config,
    createTelegramSender(telegram.api)
  );
  startTelegram(telegram, platform);
  platform.startJobs();
  platform.startEvents().catch((error) => console.error('Bot: failed to start the events', error));
} else {
  console.log('TELEGRAM_BOT_TOKEN is not set: the Telegram bot is off');
}
