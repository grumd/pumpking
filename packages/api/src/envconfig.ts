import createDebug from 'debug';
import dotenv from 'dotenv';
import path from 'path';

const { error } = dotenv.config({ path: path.join(__dirname, '/../.env') });

const debug = createDebug('backend-ts:env-config');

if (error) {
  debug(error);
  throw error;
}
