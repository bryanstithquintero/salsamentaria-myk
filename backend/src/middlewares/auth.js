/**
 * Autenticación con JWT y autorización por rol.
 */
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const db = require('../db/knex');
const AppError = require('../utils/AppError');

async function autenticar(req, _res, next) {
  const header = req.headers.authorization || '';
  const [tipo, token] = header.split(' ');
  if (tipo !== 'Bearer' || !token) return next(AppError.unauthorized());

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'La sesión expiró, inicie sesión de nuevo' : 'Token inválido';
    return next(new AppError(401, 'TOKEN_INVALIDO', msg));
  }

  // Se confirma que el usuario siga activo (permite revocar acceso de inmediato).
  const usuario = await db('usuarios as u')
    .join('roles as r', 'r.id', 'u.rol_id')
    .select('u.id', 'u.nombre', 'u.usuario', 'u.activo', 'r.nombre as rol')
    .where('u.id', payload.sub)
    .first();
  if (!usuario || !usuario.activo) return next(new AppError(401, 'USUARIO_INACTIVO', 'El usuario no está activo'));

  req.usuario = { id: usuario.id, nombre: usuario.nombre, usuario: usuario.usuario, rol: usuario.rol };
  next();
}

/** Restringe la ruta a uno o varios roles. */
function autorizar(...roles) {
  return (req, _res, next) => {
    if (!req.usuario) return next(AppError.unauthorized());
    if (!roles.includes(req.usuario.rol)) return next(AppError.forbidden());
    next();
  };
}

module.exports = { autenticar, autorizar };
