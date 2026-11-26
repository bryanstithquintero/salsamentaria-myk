/**
 * Error de aplicación con código HTTP y código de negocio.
 * Permite que el manejador central responda siempre con el mismo formato.
 */
class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details) { return new AppError(400, 'SOLICITUD_INVALIDA', message, details); }
  static unauthorized(message = 'Debe iniciar sesión') { return new AppError(401, 'NO_AUTENTICADO', message); }
  static forbidden(message = 'No tiene permisos para esta operación') { return new AppError(403, 'SIN_PERMISO', message); }
  static notFound(entidad = 'Recurso') { return new AppError(404, 'NO_ENCONTRADO', `${entidad} no encontrado`); }
  static conflict(message, details) { return new AppError(409, 'CONFLICTO', message, details); }
  static unprocessable(message, details) { return new AppError(422, 'REGLA_DE_NEGOCIO', message, details); }
}

module.exports = AppError;
