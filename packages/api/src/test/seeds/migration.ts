import { Migrator } from 'kysely';
import path from 'path';

import { db } from 'db';
import { MigrationProvider } from 'utils/MigrationProvider';

const migrator = new Migrator({
  db,
  provider: new MigrationProvider({
    folder: path.join(__dirname, '../../../migrations'),
  }),
});

export async function migrateToLatest() {
  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`migration "${it.migrationName}" was executed successfully`);
    } else if (it.status === 'Error') {
      console.error(`failed to execute migration "${it.migrationName}"`);
    }
  });

  if (error) {
    console.error('failed to migrate');
    console.error(error);
    process.exit(1);
  } else if (results?.length === 0) {
    console.log('already up to date');
  }
}
