import * as fs from 'fs/promises';
import type { Migration, MigrationProvider as IMigrationProvider } from 'kysely';
import { sql } from 'kysely';
import * as path from 'path';

const isMigration = (migration: unknown): migration is Migration => {
  return (
    typeof migration === 'object' &&
    migration !== null &&
    typeof (migration as Migration).up === 'function'
  );
};

export class MigrationProvider implements IMigrationProvider {
  folder: string;

  constructor(props: { folder: string }) {
    this.folder = props.folder;
  }

  async getMigrations() {
    const migrations: Record<string, Migration> = {};

    const files = await fs.readdir(this.folder);

    for (const fileName of files) {
      const migrationKey = fileName.substring(0, fileName.lastIndexOf('.'));

      if (
        fileName.endsWith('.js') ||
        (fileName.endsWith('.ts') && !fileName.endsWith('.d.ts')) ||
        fileName.endsWith('.mjs') ||
        (fileName.endsWith('.mts') && !fileName.endsWith('.d.mts'))
      ) {
        const migration = await import(path.join(this.folder, fileName));
        // Handle esModuleInterop export's `default` prop...
        if (isMigration(migration?.default)) {
          migrations[migrationKey] = migration.default;
        } else if (isMigration(migration)) {
          migrations[migrationKey] = migration;
        }
      }

      if (fileName.endsWith('.sql')) {
        const sqlText = await fs.readFile(path.join(this.folder, fileName), 'utf-8');
        migrations[migrationKey] = {
          up: async (db) => {
            await sqlText
              .split(';')
              .filter((query) => query.trim().length > 0)
              .reduce(async (prev, next) => {
                await prev;
                await sql.raw(next).execute(db);
              }, Promise.resolve());
          },
        };
      }
    }

    return migrations;
  }
}
