import { deleteOldEvents } from '@pumpking/core/events';
import createDebug from 'debug';
import cron from 'node-cron';
import { effectsConsumer } from 'services/effects/effectsConsumer';

const debug = createDebug('backend-ts:jobs:effects');

const POLL_INTERVAL_MS = 1000;
const EVENTS_RETENTION_DAYS = 30;

// Started from jobs/index.ts; the tests start and stop it themselves
export const startEffectsJob = () => {
  let isStopped = false;
  let timer: NodeJS.Timeout | undefined;
  let currentPoll: Promise<void> | undefined;

  // The next poll is scheduled when the current one ends, so they never overlap
  const poll = async () => {
    try {
      await effectsConsumer.processBatch();
    } catch (e) {
      console.error('Effects job: failed to read events', e);
    }
    if (!isStopped) {
      timer = setTimeout(() => (currentPoll = poll()), POLL_INTERVAL_MS);
    }
  };
  currentPoll = poll();

  // Every day at 5 AM
  const cleanup = cron.schedule('0 5 * * *', async () => {
    try {
      await deleteOldEvents(EVENTS_RETENTION_DAYS);
      debug(`Deleted processed events older than ${EVENTS_RETENTION_DAYS} days`);
    } catch (e) {
      console.error('Effects job: failed to delete old events', e);
    }
  });

  // Resolves once the poll that is running (if any) has finished
  const stop = async () => {
    isStopped = true;
    clearTimeout(timer);
    cleanup.stop();
    await currentPoll;
  };

  return { stop };
};
