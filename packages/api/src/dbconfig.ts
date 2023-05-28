import './envconfig';
import path from 'path';

const isTest = process.env.NODE_ENV === 'test';

module.exports = {
  client: 'mysql2',
  connection: {
    database: isTest ? process.env.DB_DATABASE_TEST : process.env.DB_DATABASE,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
  },
  pool: { min: 2, max: 10 },
  migrations: {
    tableName: 'knex_migrations',
    directory: path.join(__dirname, '/migrations'),
  },
};
