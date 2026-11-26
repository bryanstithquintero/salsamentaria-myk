/**
 * Catálogos de apoyo: categorías y proveedores (RF12).
 */
const { Router } = require('express');
const { z } = require('zod');
const db = require('../../db/knex');
const validar = require('../../middlewares/validar');
const { autorizar } = require('../../middlewares/auth');
const AppError = require('../../utils/AppError');
const { insertarId, aBool, aNum } = require('../../utils/bd');
const { registrarAuditoria } = require('../../utils/auditoria');
const { leerPaginacion, respuestaPaginada } = require('../../utils/paginacion');

const categorias = Router();
const proveedores = Router();

// ── Categorías ───────────────────────────────────────────────
categorias.get('/', async (_req, res) => {
  const filas = await db('categorias as c')
    .select('c.id', 'c.nombre', 'c.icono')
    .select(db.raw('(select count(*) from productos p where p.categoria_id = c.id and p.activo = ?) as productos', [true]))
    .orderBy('c.nombre');
  res.json(filas.map((c) => ({ ...c, productos: aNum(c.productos) })));
});

categorias.post('/', autorizar('admin'),
  validar(z.object({ nombre: z.string().trim().min(3).max(60), icono: z.string().max(8).optional() })),
  async (req, res) => {
    const id = await insertarId(db, 'categorias', req.body);
    res.status(201).json(await db('categorias').where({ id }).first());
  });

// ── Proveedores ──────────────────────────────────────────────
const esquemaProveedor = z.object({
  nit: z.string().trim().regex(/^[0-9-]{5,20}$/, 'NIT no válido (solo números y guion)'),
  razon_social: z.string().trim().min(3, 'Mínimo 3 caracteres').max(120),
  contacto: z.string().trim().max(100).optional().nullable(),
  telefono: z.string().trim().regex(/^[0-9 +()-]{7,20}$/, 'Teléfono no válido').optional().nullable().or(z.literal('')),
  correo: z.email('Correo no válido').optional().nullable().or(z.literal('')),
  direccion: z.string().trim().max(160).optional().nullable(),
  activo: z.boolean().optional(),
});
const esquemaId = z.object({ id: z.coerce.number().int().positive() });

const mapearProveedor = (p) => ({ ...p, activo: aBool(p.activo), productos: aNum(p.productos), lotes: aNum(p.lotes) });

proveedores.get('/', async (req, res) => {
  const pag = leerPaginacion(req.query, { limiteDef: 50 });
  const q = db('proveedores as pr');
  if (req.query.buscar) {
    const b = `%${String(req.query.buscar).toLowerCase()}%`;
    q.where((w) => w.whereRaw('lower(pr.razon_social) like ?', [b]).orWhere('pr.nit', 'like', b));
  }
  if (req.query.activo !== 'todos') q.where('pr.activo', true);
  const [{ total }] = await q.clone().count({ total: '*' });
  const filas = await q
    .select('pr.*')
    .select(db.raw('(select count(*) from productos p where p.proveedor_id = pr.id and p.activo = ?) as productos', [true]))
    .select(db.raw('(select count(*) from lotes l where l.proveedor_id = pr.id) as lotes'))
    .orderBy('pr.razon_social').limit(pag.limite).offset(pag.offset);
  res.json(respuestaPaginada(filas.map(mapearProveedor), aNum(total), pag));
});

proveedores.get('/:id', validar(esquemaId, 'params'), async (req, res) => {
  const p = await db('proveedores').where({ id: req.params.id }).first();
  if (!p) throw AppError.notFound('Proveedor');
  const entradas = await db('lotes as l').join('productos as p', 'p.id', 'l.producto_id')
    .select('l.id', 'l.fecha_ingreso', 'l.cantidad_inicial', 'l.costo_unitario', 'l.fecha_vencimiento', 'p.nombre as producto', 'p.codigo')
    .where('l.proveedor_id', p.id).orderBy('l.fecha_ingreso', 'desc').limit(20);
  res.json({ ...mapearProveedor(p), entradas });
});

proveedores.post('/', autorizar('admin'), validar(esquemaProveedor), async (req, res) => {
  const datos = { ...req.body, telefono: req.body.telefono || null, correo: req.body.correo || null };
  const id = await db.transaction(async (trx) => {
    const nuevo = await insertarId(trx, 'proveedores', datos);
    await registrarAuditoria(trx, { usuarioId: req.usuario.id, accion: 'CREAR', entidad: 'proveedor', entidadId: nuevo, detalle: { nit: datos.nit }, ip: req.ip });
    return nuevo;
  });
  res.status(201).json(mapearProveedor(await db('proveedores').where({ id }).first()));
});

proveedores.put('/:id', autorizar('admin'), validar(esquemaId, 'params'), validar(esquemaProveedor.partial()), async (req, res) => {
  const { id } = req.params;
  if (!(await db('proveedores').where({ id }).first())) throw AppError.notFound('Proveedor');
  await db.transaction(async (trx) => {
    await trx('proveedores').where({ id }).update({ ...req.body, updated_at: trx.fn.now() });
    await registrarAuditoria(trx, { usuarioId: req.usuario.id, accion: 'EDITAR', entidad: 'proveedor', entidadId: id, detalle: req.body, ip: req.ip });
  });
  res.json(mapearProveedor(await db('proveedores').where({ id }).first()));
});

module.exports = { categorias, proveedores };
