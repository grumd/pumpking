import dotenv from 'dotenv';
import path from 'path';

// The service's own settings (packages/ingest/.env). The DB config comes from core's .env.
// Variables already set in the environment win; the file may be missing
dotenv.config({ path: path.join(__dirname, '../.env') });
