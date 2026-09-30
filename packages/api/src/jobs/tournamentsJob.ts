import { SITE_TIMEZONE } from '@pumpking/core/constants/tournaments';
import createDebug from 'debug';
import cron from 'node-cron';
import { createTournament, currentSiteMonth, endTournaments } from 'services/tournaments/lifecycle';

const debug = createDebug('backend-ts:jobs:tournaments');

if (process.env.TOURNAMENT_JOB === 'enabled') {
  cron.schedule(
    '0 0 1 * *',
    async () => {
      try {
        const { id, created } = await createTournament(currentSiteMonth());
        debug(created ? `Created tournament ${id}` : `Tournament ${id} already exists`);
      } catch (e) {
        debug('Failed to create tournament', e);
      }
    },
    { timezone: SITE_TIMEZONE }
  );

  cron.schedule(
    '0 0 25 * *',
    async () => {
      try {
        debug(`Ended ${await endTournaments()} tournament(s)`);
      } catch (e) {
        debug('Failed to end tournaments', e);
      }
    },
    { timezone: SITE_TIMEZONE }
  );
}
