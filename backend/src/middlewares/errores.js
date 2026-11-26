/**
 * Manejo centralizado de errores (detección y respuesta uniforme).
 * Formato: { error: { codigo, mensaje, detalles?, solicitud } }
 */
const crypto = require('crypto');
const env = require('../config/env');
const AppError = require('../utils/AppError');

function noEncontrado(req, _res, next) {
  next(new AppError(404, 'RUTA_NO_ENCONTRADA', `No existe la ruta ${req.method} ${req.originalUrl}`));
}

/** Traduce errores de la base de datos (PostgreSQL y SQLite) a errores de negocio. */
function traducirErrorBD(err) {
  const msg = String(err.message || '');
  if (err.code === '23505' || err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return AppError.conflict('Ya existe un registro con ese valor único', { restriccion: err.constraint || msg.split(':').pop().trim() });
  }
  if (err.code === '23503' || err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    return AppError.conflict('La operación viola una relación entre registros');
  }
  if (err.code === '23514' || err.code === 'SQLITE_CONSTRAINT_CHECK') {
    return AppError.unprocessable('La operación deja datos inconsistentes (por ejemplo, inventario negativo)');
  }
  return null;
}

// eslint-disable-next-line no-unused-vars
function manejadorErrores(err, req, res, _next) {
  const solicitud = req.id || crypto.randomUUID();

  let error = err instanceof AppError ? err : traducirErrorBD(err);
  if (!error && err.type === 'entity.parse.failed') {
    error = AppError.badRequest('El cuerpo de la solicitud no es un JSON válido');
  }
  if (!error && err.type === 'entity.too.large') {
    error = new AppError(413, 'CUERPO_DEMASIADO_GRANDE', 'La solicitud supera el tamaño permitido');
  }
  if (!error) {
    // Error no controlado: se registra completo pero no se expone al cliente.
    console.error(`[${solicitud}]`, err);
    error = new AppError(500, 'ERROR_INTERNO', 'Ocurrió un error inesperado. Intente de nuevo.');
  } else if (error.status >= 500 || (!env.isTest && error.status !== 401 && error.status !== 404)) {
    console.warn(`[${solicitud}] ${req.method} ${req.originalUrl} → ${error.status} ${error.code}: ${error.message}`);
  }

  res.status(error.status).json({
    error: {
      codigo: error.code,
      mensaje: error.message,
      ...(error.details ? { detalles: error.details } : {}),
      solicitud,
    },
  });
}

module.exports = { noEncontrado, manejadorErrores };
