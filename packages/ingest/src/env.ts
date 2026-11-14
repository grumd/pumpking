import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

export const getUploadsRoot = () => {
  const root = process.env.UPLOADS_ROOT;
  if (!root) {
    throw new Error('UPLOADS_ROOT is not set: add it to packages/ingest/.env');
  }
  return root;
};
