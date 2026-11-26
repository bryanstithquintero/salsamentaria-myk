/**
 * Utilidades de base de datos independientes del motor (SQLite / PostgreSQL).
 */
const db = require('../db/knex');

const esPostgres = () => ['pg', 'postgres', 'postgresql'].includes(db.client.config.client);

/** Inserta un registro y devuelve su id (funciona en ambos motores). */
async function insertarId(trx, tabla, datos) {
  const [fila] = await trx(tabla).insert(datos).returning('id');
  return typeof fila === 'object' ? fila.id : fila;
}

/** Bloquea filas para actualización en PostgreSQL (SQLite ya serializa las escrituras). */
function paraActualizar(query) {
  return esPostgres() ? query.forUpdate() : query;
}

/** Convierte 0/1 de SQLite a booleano. */
const aBool = (v) => v === true || v === 1 || v === '1' || v === 't';

/** Número entero seguro a partir de agregados (count/sum pueden llegar como texto). */
const aNum = (v) => (v === null || v === undefined ? 0 : Number(v));

module.exports = { esPostgres, insertarId, paraActualizar, aBool, aNum };
