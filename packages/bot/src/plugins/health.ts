import { wrap } from '../platform/texts';
import type { Plugin } from '../platform/types';

// Tells the admin when a service's /healthz stops answering, and when it's back. The
// bot runs on its own, so it keeps watching when the API or ingestion is down

// Checks in a row that have to fail before the service counts as down
const FAILURES_TO_ALERT = 2;

const checkHealth = async (url: string): Promise<string | undefined> => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    return response.ok ? undefined : `HTTP ${response.status}`;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};

export const createHealthPlugin = (): Plugin => {
  const failures = new Map<string, number>();

  return {
    name: 'health',
    jobs: [
      {
        name: 'health checks',
        intervalMs: 60 * 1000,
        run: async (bot) => {
          for (const { name, url } of bot.config.healthChecks) {
            const problem = await checkHealth(url);
            const failed = failures.get(name) ?? 0;
            if (problem) {
              failures.set(name, failed + 1);
              if (failed + 1 === FAILURES_TO_ALERT) {
                await bot.sendToAdmin(`❗️  <b>${name}</b> is down: ${wrap(problem)}`);
              }
            } else {
              failures.set(name, 0);
              if (failed >= FAILURES_TO_ALERT) {
                await bot.sendToAdmin(`✅  <b>${name}</b> is back`);
              }
            }
          }
        },
      },
    ],
  };
};
