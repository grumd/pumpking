import { requireEnv } from '../src/env';
import { execFileSync } from 'child_process';
import path from 'path';

const url = `mysql://${encodeURIComponent(requireEnv('DB_USERNAME'))}:${encodeURIComponent(
  requireEnv('DB_PASSWORD')
)}@localhost/${requireEnv('DB_DATABASE')}`;

execFileSync('kysely-codegen', ['--url', url, '--out-file', './src/database.ts'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
});
