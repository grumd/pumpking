import '../src/envconfig';
import { updateAllPp } from '../src/services/charts/chartDifficultyInterpolation';
import { rebuildPpHistory } from '../src/services/players/ppHistoryRebuild';
import { db } from '@pumpking/database/db';

// npm run rebuild-pp-history   recalculate every result's pp and player's total, then
//                              replace the pp and rank history with a replay of all results
async function main() {
  console.log('Updating pp of all results and players');
  await updateAllPp();
  console.log('Replaying the pp and rank history');
  const { rankRows, ppRows } = await rebuildPpHistory();
  console.log(`Wrote ${rankRows} rank rows and ${ppRows} pp rows`);

  await db.destroy();
}

main();
