import { db } from '../src/db';
import {
  createTournament,
  currentSiteMonth,
  endTournaments,
} from '../src/services/tournaments/lifecycle';

// npm run tournament -- create [YYYY-MM]   create the month's tournament (default: current month)
// npm run tournament -- end                end every Live tournament past its end date
async function main() {
  const [command, arg] = process.argv.slice(2);

  if (command === 'create') {
    const [year, month] = arg ? arg.split('-').map(Number) : [];
    const { id, created } = await createTournament(
      year && month ? { year, month } : currentSiteMonth()
    );
    console.log(created ? `Created tournament ${id}` : `Tournament ${id} already exists`);
  } else if (command === 'end') {
    console.log(`Ended ${await endTournaments()} tournament(s)`);
  } else {
    console.log('Usage: npm run tournament -- create [YYYY-MM] | end');
  }

  await db.destroy();
}

main();
