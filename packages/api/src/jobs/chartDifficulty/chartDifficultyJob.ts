import createDebug from 'debug';
import cron from 'node-cron';
import { updateChartsDifficulty } from 'services/charts/chartDifficultyInterpolation';

const debug = createDebug('backend-ts:jobs:chart-difficulty');

// Every day at 4 AM
cron.schedule('0 4 * * *', async () => {
  debug('Starting job: Recalculate chart difficulty and all pp');
  await updateChartsDifficulty();
  debug('Job finished: Recalculate chart difficulty and all pp');
});
