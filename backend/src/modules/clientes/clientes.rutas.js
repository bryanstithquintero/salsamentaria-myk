/**
 * Clientes (RF11): ficha, historial de compras y saldo de crédito.
 * Incluye la autorización de tratamiento de datos personales (Ley 1581 de 2012).
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
const { hoy, sumarDias } = require('../../utils/fechas');

const router = Router();

const esquemaCliente = z.object({
  documento: z.string().trim().regex(/^[0-9A-Za-z-]{5,20}$/, 'Documento no válido').optional().nullable().or(z.literal('')),
  nombre: z.string().trim().min(3, 'Mínimo 3 caracteres').max(120),
  telefono: z.string().trim().regex(/^[0-9 +()-]{7,20}$/, 'Teléfono no válido').optional().nullable().or(z.literal('')),
  correo: z.email('Correo no válido').optional().nullable().or(z.literal('')),
  direccion: z.string().trim().max(160).optional().nullable(),
  autoriza_datos: z.boolean({ error: 'Indique si autoriza el tratamiento de datos' }),
  activo: z.boolean().optional(),
});
const esquemaId = z.object({ id: z.coerce.number().int().positive() });

const limpiar = (d) => ({ ...d, documento: d.documento || null, telefono: d.telefono || null, correo: d.correo || null });

/** Agregados por cliente calculados con subconsultas correlacionadas (una sola consulta). */
function conAgregados(q) {
  return q
    .select(db.raw("(select count(*) from ventas v where v.cliente_id = c.id and v.estado <> 'anulada') as compras"))
    .select(db.raw("(select coalesce(sum(v.total), 0) from ventas v where v.cliente_id = c.id and v.estado <> 'anulada') as total_comprado"))
    .select(db.raw("(select coalesce(sum(v.saldo), 0) from ventas v where v.cliente_id = c.id and v.estado = 'pendiente') as saldo"))
    .select(db.raw("(select max(v.fecha) from ventas v where v.cliente_id = c.id and v.estado <> 'anulada') as ultima_compra"));
}

const mapear = (c) => ({
  ...c,
  autoriza_datos: aBool(c.autoriza_datos),
  activo: aBool(c.activo),
  compras: aNum(c.compras),
  total_comprado: aNum(c.total_comprado),
  saldo: aNum(c.saldo),
});

router.get('/', async (req, res) => {
  const pag = leerPaginacion(req.query, { limiteDef: 20 });
  const q = db('clientes as c');
  if (req.query.activo !== 'todos') q.where('c.activo', true);
  if (req.query.buscar) {
    const b = `%${String(req.query.buscar).toLowerCase()}%`;
    q.where((w) => w.whereRaw('lower(c.nombre) like ?', [b]).orWhere('c.documento', 'like', b).orWhere('c.telefono', 'like', b));
  }
  if (req.query.con_saldo === 'true') {
    q.whereExists(db('ventas as vs').whereRaw('vs.cliente_id = c.id').where('vs.estado', 'pendiente'));
  }
  const [{ total }] = await q.clone().count({ total: '*' });
  const filas = await conAgregados(q.clone().select('c.*')).orderBy('c.nombre').limit(pag.limite).offset(pag.offset);

  const desde = sumarDias(hoy(), -30);
  const [{ activos }] = await db('ventas').where('fecha', '>=', desde).whereNot('estado', 'anulada').whereNotNull('cliente_id').countDistinct({ activos: 'cliente_id' });
  const [{ cartera }] = await db('ventas').where('estado', 'pendiente').sum({ cartera: 'saldo' });

  const r = respuestaPaginada(filas.map(mapear), aNum(total), pag);
  r.meta.resumen = { activos_30_dias: aNum(activos), cartera: aNum(cartera) };
  res.json(r);
});

router.get('/:id', validar(esquemaId, 'params'), async (req, res) => {
  const c = await conAgregados(db('clientes as c').select('c.*')).where('c.id', req.params.id).first();
  if (!c) throw AppError.notFound('Cliente');
  const ventas = await db('ventas').select('id', 'consecutivo', 'fecha', 'hora', 'total', 'saldo', 'estado', 'medio_pago')
    .where('cliente_id', c.id).orderBy('fecha', 'desc').orderBy('id', 'desc').limit(50);
  const favoritos = await db('detalle_venta as d').join('ventas as v', 'v.id', 'd.venta_id').join('productos as p', 'p.id', 'd.producto_id')
    .where('v.cliente_id', c.id).whereNot('v.estado', 'anulada')
    .select('p.nombre').sum({ unidades: 'd.cantidad' }).groupBy('p.id', 'p.nombre').orderBy('unidades', 'desc').limit(3);
  res.json({
    ...mapear(c),
    ventas: ventas.map((v) => ({ ...v, total: aNum(v.total), saldo: aNum(v.saldo) })),
    favoritos: favoritos.map((f) => ({ nombre: f.nombre, unidades: aNum(f.unidades) })),
  });
});

router.post('/', validar(esquemaCliente), async (req, res) => {
  const id = await db.transaction(async (trx) => {
    const nuevo = await insertarId(trx, 'clientes', limpiar(req.body));
    await registrarAuditoria(trx, { usuarioId: req.usuario.id, accion: 'CREAR', entidad: 'cliente', entidadId: nuevo, ip: req.ip });
    return nuevo;
  });
  res.status(201).json(mapear(await conAgregados(db('clientes as c').select('c.*')).where('c.id', id).first()));
});

router.put('/:id', validar(esquemaId, 'params'), validar(esquemaCliente.partial()), async (req, res) => {
  const { id } = req.params;
  if (!(await db('clientes').where({ id }).first())) throw AppError.notFound('Cliente');
  if (req.body.activo === false && req.usuario.rol !== 'admin') throw AppError.forbidden('Solo el administrador puede desactivar clientes');
  const datos = { ...req.body };
  ['documento', 'telefono', 'correo'].forEach((k) => { if (k in datos) datos[k] = datos[k] || null; });
  await db.transaction(async (trx) => {
    await trx('clientes').where({ id }).update({ ...datos, updated_at: trx.fn.now() });
    await registrarAuditoria(trx, { usuarioId: req.usuario.id, accion: 'EDITAR', entidad: 'cliente', entidadId: id, ip: req.ip });
  });
  res.json(mapear(await conAgregados(db('clientes as c').select('c.*')).where('c.id', id).first()));
});

router.delete('/:id', autorizar('admin'), validar(esquemaId, 'params'), async (req, res) => {
  const { id } = req.params;
  if (!(await db('clientes').where({ id }).first())) throw AppError.notFound('Cliente');
  const pendiente = await db('ventas').where({ cliente_id: id, estado: 'pendiente' }).first();
  if (pendiente) throw AppError.unprocessable('El cliente tiene saldo pendiente; no se puede desactivar');
  await db.transaction(async (trx) => {
    await trx('clientes').where({ id }).update({ activo: false, updated_at: trx.fn.now() });
    await registrarAuditoria(trx, { usuarioId: req.usuario.id, accion: 'DESACTIVAR', entidad: 'cliente', entidadId: id, ip: req.ip });
  });
  res.status(204).end();
});

module.exports = router;
