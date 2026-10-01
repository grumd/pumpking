import minimist from 'minimist';
import { NO_MIGRATIONS } from 'kysely';

import { db, migrator } from './db';

async function rollback() {
  const args = minimist(process.argv.slice(2));

  if (!args.n) {
    console.log(
      'Migrating down 1 step. To migrate in batches, use "npm run migrate:rollback -- -n <number of steps>".'
    );
  }

  const steps = args.n ?? 1;

  const migrations = (await migrator.getMigrations()).filter((migration) => migration.executedAt);

  const targetIndex = migrations.length - steps - 1;

  const targetMigrationName = targetIndex < 0 ? NO_MIGRATIONS : migrations[targetIndex]?.name;

  const { error, results } = await migrator.migrateTo(targetMigrationName);

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`migration "${it.migrationName}" was rolled back`);
    } else if (it.status === 'Error') {
      console.error(`failed to roll back migration "${it.migrationName}"`);
    }
  });

  if (error) {
    console.error('failed to rollback');
    console.error(error);
    process.exit(1);
  }

  console.log('Rollback completed');
  console.log(
    `Latest applied migration: ${
      (await migrator.getMigrations()).find((m) => m.executedAt)?.name ?? 'None'
    }`
  );

  await db.destroy();
}

rollback();
