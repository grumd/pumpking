import { migrateToLatest } from '../src/migrator';
import { db, migrator } from './db';

migrateToLatest(migrator).then(() => db.destroy());
