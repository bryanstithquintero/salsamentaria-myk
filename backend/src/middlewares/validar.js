/**
 * Middleware de validación con Zod.
 * Valida body, query o params y reemplaza el valor por la versión ya validada y convertida.
 */
const AppError = require('../utils/AppError');

function validar(esquema, origen = 'body') {
  return (req, _res, next) => {
    const resultado = esquema.safeParse(req[origen] ?? {});
    if (!resultado.success) {
      const errores = resultado.error.issues.map((i) => ({
        campo: i.path.join('.') || origen,
        mensaje: i.message,
      }));
      return next(new AppError(400, 'VALIDACION', 'Los datos enviados no son válidos', errores));
    }
    if (origen === 'query') {
      // En Express 5 req.query es de solo lectura: se guarda en req.validQuery
      req.validQuery = resultado.data;
    } else {
      req[origen] = resultado.data;
    }
    next();
  };
}

module.exports = validar;
