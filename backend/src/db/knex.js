/**
 * Instancia única de Knex para toda la aplicación.
 */
const knex = require('knex');
const config = require('../../knexfile');
const env = require('../config/env');

if (env.isProd) {
  // PostgreSQL: devolver DATE como texto 'YYYY-MM-DD' y los conteos como número.
  const { types } = require('pg');
  types.setTypeParser(1082, (v) => v); // date
  types.setTypeParser(20, (v) => parseInt(v, 10)); // bigint (count, sum)
  types.setTypeParser(1700, (v) => parseFloat(v)); // numeric
}

const db = knex(config[env.NODE_ENV] || config.development);

module.exports = db;
