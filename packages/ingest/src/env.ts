import dotenv from 'dotenv';
import path from 'path';

// The service's own settings (packages/ingest/.env). The DB config comes from core's .env.
// Variables already set in the environment win; the file may be missing
dotenv.config({ path: path.join(__dirname, '../.env') });

// Where piu-spy's uploads go, one folder per agent (the legacy PIUTOP_UPLOADS_ROOT)
export const getUploadsRoot = () => {
  const root = process.env.UPLOADS_ROOT;
  if (!root) {
    throw new Error('UPLOADS_ROOT is not set: add it to packages/ingest/.env');
  }
  return root;
};
