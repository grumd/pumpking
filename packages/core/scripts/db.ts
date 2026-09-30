import { db } from '../src/db';
import { createMigrator } from '../src/migrator';

export { db };

export const migrator = createMigrator(db);
