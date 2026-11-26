const { Router } = require('express');
const { z } = require('zod');
const db = require('../../db/knex');
const validar = require('../../middlewares/validar');
const { autorizar } = require('../../middlewares/auth');
const { leerPaginacion, respuestaPaginada } = require('../../utils/paginacion');
const { aNum } = require('../../utils/bd');
const servicio = require('./inventario.servicio');

const router = Router();
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha con formato AAAA-MM-DD');
const idPositivo = z.coerce.number().int().positive();

const esquemaEntrada = z.object({
  producto_id: idPositivo,
  proveedor_id: idPositivo.nullable().optional(),
  cantidad: z.coerce.number().int('Debe ser un número entero').positive('Debe ser mayor que cero').max(100000),
  costo_unitario: z.coerce.number().int().positive('Debe ser mayor que cero').optional(),
  fecha_vencimiento: fecha.nullable().optional(),
  codigo_lote: z.string().trim().max(40).optional().nullable(),
  observacion: z.string().trim().max(150).optional().nullable(),
});

const esquemaAjuste = z.object({
  producto_id: idPositivo,
  lote_id: idPositivo.nullable().optional(),
  cantidad: z.coerce.number().int('Debe ser un número entero').refine((v) => v !== 0, 'La cantidad no puede ser cero'),
  motivo: z.enum(['merma', 'vencimiento', 'averia', 'conteo', 'otro'], { error: 'Motivo no válido' }),
  observacion: z.string().trim().max(150).optional().nullable(),
});

router.get('/alertas', validar(z.object({ dias: z.coerce.number().int().min(1).max(60).default(7) }), 'query'), async (req, res) => {
  res.json(await servicio.alertas(req.validQuery.dias));
});

router.get('/lotes', async (req, res) => {
  const pag = leerPaginacion(req.query, { limiteDef: 25 });
  const q = db('lotes as l')
    .join('productos as p', 'p.id', 'l.producto_id')
    .leftJoin('proveedores as pr', 'pr.id', 'l.proveedor_id');
  if (req.query.producto_id) q.where('l.producto_id', Number(req.query.producto_id));
  if (req.query.disponibles !== 'false') q.where('l.cantidad_disponible', '>', 0);
  if (req.query.buscar) {
    const b = `%${String(req.query.buscar).toLowerCase()}%`;
    q.where((w) => w.whereRaw('lower(p.nombre) like ?', [b]).orWhereRaw('lower(p.codigo) like ?', [b]));
  }
  const [{ total }] = await q.clone().count({ total: '*' });
  const filas = await q
    .select('l.*', 'p.codigo', 'p.nombre as producto', 'p.unidad', 'pr.razon_social as proveedor')
    .orderByRaw('case when l.fecha_vencimiento is null then 1 else 0 end')
    .orderBy('l.fecha_vencimiento').orderBy('l.id')
    .limit(pag.limite).offset(pag.offset);
  res.json(respuestaPaginada(filas, aNum(total), pag));
});

router.get('/movimientos', async (req, res) => {
  const pag = leerPaginacion(req.query, { limiteDef: 25 });
  const q = db('movimientos_inventario as m')
    .join('productos as p', 'p.id', 'm.producto_id')
    .leftJoin('usuarios as u', 'u.id', 'm.usuario_id')
    .leftJoin('ventas as v', 'v.id', 'm.venta_id');
  if (req.query.producto_id) q.where('m.producto_id', Number(req.query.producto_id));
  if (req.query.tipo) q.where('m.tipo', String(req.query.tipo));
  const [{ total }] = await q.clone().count({ total: '*' });
  const filas = await q
    .select('m.*', 'p.codigo', 'p.nombre as producto', 'u.nombre as usuario', 'v.consecutivo')
    .orderBy('m.id', 'desc').limit(pag.limite).offset(pag.offset);
  res.json(respuestaPaginada(filas, aNum(total), pag));
});

router.post('/entradas', autorizar('admin'), validar(esquemaEntrada), async (req, res) => {
  res.status(201).json(await servicio.registrarEntrada(req.body, req.usuario, req.ip));
});

router.post('/ajustes', autorizar('admin'), validar(esquemaAjuste), async (req, res) => {
  res.status(201).json(await servicio.registrarAjuste(req.body, req.usuario, req.ip));
});

module.exports = router;
