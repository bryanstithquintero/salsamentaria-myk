const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../db/knex');
const env = require('../../config/env');
const AppError = require('../../utils/AppError');
const { aBool } = require('../../utils/bd');

function firmarToken(usuario) {
  return jwt.sign({ sub: usuario.id, rol: usuario.rol, nombre: usuario.nombre }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

async function login({ usuario, contrasena }) {
  const ident = usuario.trim().toLowerCase();
  const u = await db('usuarios as u')
    .join('roles as r', 'r.id', 'u.rol_id')
    .select('u.id', 'u.nombre', 'u.usuario', 'u.correo', 'u.hash_contrasena', 'u.activo', 'r.nombre as rol')
    .whereRaw('lower(u.usuario) = ?', [ident])
    .orWhereRaw('lower(u.correo) = ?', [ident])
    .first();

  // Mismo mensaje para usuario inexistente o contraseña errada (no revela cuál falló).
  const valido = u && (await bcrypt.compare(contrasena, u.hash_contrasena));
  if (!valido) throw new AppError(401, 'CREDENCIALES_INVALIDAS', 'Usuario o contraseña incorrectos');
  if (!aBool(u.activo)) throw new AppError(403, 'USUARIO_INACTIVO', 'El usuario está desactivado. Contacte al administrador');

  const perfil = { id: u.id, nombre: u.nombre, usuario: u.usuario, correo: u.correo, rol: u.rol };
  return { token: firmarToken(perfil), usuario: perfil };
}

async function cambiarContrasena(usuarioId, { actual, nueva }) {
  const u = await db('usuarios').where({ id: usuarioId }).first();
  if (!u || !(await bcrypt.compare(actual, u.hash_contrasena))) {
    throw new AppError(400, 'CONTRASENA_ACTUAL_INVALIDA', 'La contraseña actual no es correcta');
  }
  await db('usuarios').where({ id: usuarioId }).update({ hash_contrasena: await bcrypt.hash(nueva, 10), updated_at: db.fn.now() });
}

module.exports = { login, cambiarContrasena, firmarToken };
