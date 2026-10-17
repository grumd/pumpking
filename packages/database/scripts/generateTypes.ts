import { requireEnv } from '../src/env';
import { execFileSync } from 'child_process';
import path from 'path';

// Introspects the dev DB from packages/database/.env. database.ts is hand-patched where
// marked HAND-PATCHED: review the diff and re-apply those blocks after a regen
const url = `mysql://${encodeURIComponent(requireEnv('DB_USERNAME'))}:${encodeURIComponent(
  requireEnv('DB_PASSWORD')
)}@localhost/${requireEnv('DB_DATABASE')}`;

execFileSync('kysely-codegen', ['--url', url, '--out-file', './src/database.ts'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
});
