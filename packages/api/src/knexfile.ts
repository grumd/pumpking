require('dotenv').config({ path: '../.env' });

require('tsconfig-paths/register');
require('ts-node/register');

module.exports = require('./dbconfig.ts');
