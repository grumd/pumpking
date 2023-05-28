import Knex from 'knex';
import { TypedKnex } from '@wwwouter/typed-knex';

const config = require('./dbconfig');
export const knexEx = Knex(config);
export const knex = new TypedKnex(knexEx);

// export default Bookshelf(knex)
