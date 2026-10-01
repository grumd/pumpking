import dotenv from 'dotenv';
import path from 'path';

// The DB config lives with the DB, in packages/database/.env, whichever service or script
// imports it. Variables already set in the environment win; the file may be missing
// when everything comes from the environment
dotenv.config({ path: path.join(__dirname, '../.env') });

export const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`${name} is not set: add it to packages/database/.env`);
  }
  return value;
};
