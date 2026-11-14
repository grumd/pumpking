import '../src/envconfig';
import { updateAllPp } from '../src/services/charts/chartDifficultyInterpolation';
import { rebuildPpHistory } from '../src/services/players/ppHistoryRebuild';
import { db } from '@pumpking/database/db';

async function main() {
  console.log('Updating pp of all results and players');
  await updateAllPp();
  console.log('Replaying the pp and rank history');
  const { rankRows, ppRows } = await rebuildPpHistory();
  console.log(`Wrote ${rankRows} rank rows and ${ppRows} pp rows`);

  await db.destroy();
}

main();
