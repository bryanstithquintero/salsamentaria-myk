/**
 * Configuración de Knex por entorno.
 * - development: SQLite en archivo (cero instalación para trabajar en VS Code).
 * - test: SQLite en memoria (pruebas aisladas y rápidas).
 * - production: PostgreSQL (Neon u otro proveedor) a partir de DATABASE_URL.
 */
require('dotenv').config({ quiet: true });
const path = require('path');

const migrations = { directory: path.join(__dirname, 'src/db/migrations') };
const seeds = { directory: path.join(__dirname, 'src/db/seeds') };

// SQLite no aplica llaves foráneas por defecto: se activan en cada conexión.
const sqlitePool = {
  afterCreate: (conn, done) => {
    conn.pragma('foreign_keys = ON');
    done();
  },
};

module.exports = {
  development: {
    client: 'better-sqlite3',
    connection: { filename: path.join(__dirname, 'data/myk.sqlite3') },
    useNullAsDefault: true,
    pool: sqlitePool,
    migrations,
    seeds,
  },
  test: {
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
    pool: { ...sqlitePool, min: 1, max: 1 },
    migrations,
    seeds,
  },
  production: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
    },
    pool: { min: 0, max: 5 },
    migrations,
    seeds,
  },
};
