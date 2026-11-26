/**
 * Gestión de usuarios y roles (RF02). Solo administrador.
 */
const { Router } = require('express');
const { z } = require('zod');
const bcrypt = require('bcryptjs');
const db = require('../../db/knex');
const validar = require('../../middlewares/validar');
const { autorizar } = require('../../middlewares/auth');
const AppError = require('../../utils/AppError');
const { insertarId, aBool } = require('../../utils/bd');
const { registrarAuditoria } = require('../../utils/auditoria');

const router = Router();
router.use(autorizar('admin'));

const base = {
  nombre: z.string().trim().min(3, 'Mínimo 3 caracteres').max(100),
  correo: z.email('Correo no válido').max(120).optional().nullable(),
  rol: z.enum(['admin', 'vendedor'], { error: 'Rol no válido' }),
  activo: z.boolean().optional(),
};
const esquemaCrear = z.object({
  ...base,
  usuario: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,40}$/, 'Solo letras, números, punto o guion (3 a 40)'),
  contrasena: z.string().min(8, 'Mínimo 8 caracteres').max(100),
});
const esquemaEditar = z.object(base).partial();
const esquemaReset = z.object({ contrasena: z.string().min(8, 'Mínimo 8 caracteres').max(100) });
const esquemaId = z.object({ id: z.coerce.number().int().positive() });

const mapear = (u) => ({ id: u.id, nombre: u.nombre, usuario: u.usuario, correo: u.correo, rol: u.rol, activo: aBool(u.activo), creado: u.created_at });

const consulta = () => db('usuarios as u').join('roles as r', 'r.id', 'u.rol_id')
  .select('u.id', 'u.nombre', 'u.usuario', 'u.correo', 'u.activo', 'u.created_at', 'r.nombre as rol');

async function idRol(nombre) {
  const rol = await db('roles').where({ nombre }).first();
  if (!rol) throw AppError.badRequest('Rol no válido');
  return rol.id;
}

router.get('/', async (_req, res) => {
  res.json((await consulta().orderBy('u.nombre')).map(mapear));
});

router.post('/', validar(esquemaCrear), async (req, res) => {
  const { nombre, usuario, correo, rol, contrasena } = req.body;
  const id = await db.transaction(async (trx) => {
    const nuevoId = await insertarId(trx, 'usuarios', {
      nombre, usuario, correo: correo || null, rol_id: await idRol(rol),
      hash_contrasena: await bcrypt.hash(contrasena, 10), activo: true,
    });
    await registrarAuditoria(trx, { usuarioId: req.usuario.id, accion: 'CREAR', entidad: 'usuario', entidadId: nuevoId, detalle: { usuario, rol }, ip: req.ip });
    return nuevoId;
  });
  res.status(201).json(mapear(await consulta().where('u.id', id).first()));
});

router.put('/:id', validar(esquemaId, 'params'), validar(esquemaEditar), async (req, res) => {
  const { id } = req.params;
  const actual = await db('usuarios').where({ id }).first();
  if (!actual) throw AppError.notFound('Usuario');
  if (id === req.usuario.id && (req.body.activo === false || (req.body.rol && req.body.rol !== 'admin'))) {
    throw AppError.unprocessable('No puede desactivarse ni quitarse el rol de administrador a sí mismo');
  }
  const cambios = {};
  if (req.body.nombre !== undefined) cambios.nombre = req.body.nombre;
  if (req.body.correo !== undefined) cambios.correo = req.body.correo || null;
  if (req.body.activo !== undefined) cambios.activo = req.body.activo;
  if (req.body.rol !== undefined) cambios.rol_id = await idRol(req.body.rol);
  await db.transaction(async (trx) => {
    await trx('usuarios').where({ id }).update({ ...cambios, updated_at: trx.fn.now() });
    await registrarAuditoria(trx, { usuarioId: req.usuario.id, accion: 'EDITAR', entidad: 'usuario', entidadId: id, detalle: req.body, ip: req.ip });
  });
  res.json(mapear(await consulta().where('u.id', id).first()));
});

router.patch('/:id/contrasena', validar(esquemaId, 'params'), validar(esquemaReset), async (req, res) => {
  const { id } = req.params;
  if (!(await db('usuarios').where({ id }).first())) throw AppError.notFound('Usuario');
  await db.transaction(async (trx) => {
    await trx('usuarios').where({ id }).update({ hash_contrasena: await bcrypt.hash(req.body.contrasena, 10), updated_at: trx.fn.now() });
    await registrarAuditoria(trx, { usuarioId: req.usuario.id, accion: 'RESTABLECER_CONTRASENA', entidad: 'usuario', entidadId: id, ip: req.ip });
  });
  res.status(204).end();
});

module.exports = router;
