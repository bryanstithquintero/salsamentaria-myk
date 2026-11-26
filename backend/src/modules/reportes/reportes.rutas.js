/**
 * Reportes por período (RF14) con exportación CSV. Solo administrador.
 */
const { Router } = require('express');
const { z } = require('zod');
const db = require('../../db/knex');
const validar = require('../../middlewares/validar');
const { autorizar } = require('../../middlewares/auth');
const { aNum } = require('../../utils/bd');
const { aCsv } = require('../../utils/csv');
const { hoy, sumarDias } = require('../../utils/fechas');

const router = Router();
router.use(autorizar('admin'));

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha con formato AAAA-MM-DD');
const esquema = z.object({
  desde: fecha.optional(),
  hasta: fecha.optional(),
  formato: z.enum(['json', 'csv']).default('json'),
}).refine((f) => !f.desde || !f.hasta || f.desde <= f.hasta, { message: 'La fecha inicial debe ser anterior a la final', path: ['desde'] });

router.get('/ventas', validar(esquema, 'query'), async (req, res) => {
  const hasta = req.validQuery.hasta || hoy();
  const desde = req.validQuery.desde || sumarDias(hasta, -29);
  const vigentes = () => db('ventas as v').whereBetween('v.fecha', [desde, hasta]).whereNot('v.estado', 'anulada');

  if (req.validQuery.formato === 'csv') {
    const filas = await db('ventas as v')
      .join('detalle_venta as d', 'd.venta_id', 'v.id')
      .join('productos as p', 'p.id', 'd.producto_id')
      .leftJoin('clientes as c', 'c.id', 'v.cliente_id')
      .join('usuarios as u', 'u.id', 'v.usuario_id')
      .select('v.consecutivo', 'v.fecha', 'v.hora', 'v.estado', 'v.medio_pago', 'c.nombre as cliente', 'u.nombre as vendedor',
        'p.codigo', 'p.nombre as producto', 'd.cantidad', 'd.precio_unitario', 'd.subtotal')
      .whereBetween('v.fecha', [desde, hasta]).orderBy('v.fecha').orderBy('v.id');
    const csv = aCsv([
      { titulo: 'Venta', valor: 'consecutivo' }, { titulo: 'Fecha', valor: 'fecha' }, { titulo: 'Hora', valor: 'hora' },
      { titulo: 'Estado', valor: 'estado' }, { titulo: 'Medio de pago', valor: 'medio_pago' },
      { titulo: 'Cliente', valor: (f) => f.cliente || 'Cliente eventual' }, { titulo: 'Vendedor', valor: 'vendedor' },
      { titulo: 'Código', valor: 'codigo' }, { titulo: 'Producto', valor: 'producto' }, { titulo: 'Cantidad', valor: 'cantidad' },
      { titulo: 'Precio unitario', valor: 'precio_unitario' }, { titulo: 'Subtotal', valor: 'subtotal' },
    ], filas);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ventas-${desde}-a-${hasta}.csv"`);
    return res.send(csv);
  }

  const [[resumen], [anuladas], porMedio, porDia, top, porVendedor, porCategoria] = await Promise.all([
    vigentes().count({ ventas: '*' }).sum({ monto: 'v.total' }).sum({ saldo: 'v.saldo' }),
    db('ventas').whereBetween('fecha', [desde, hasta]).where('estado', 'anulada').count({ n: '*' }).sum({ monto: 'total' }),
    vigentes().select('v.medio_pago').count({ ventas: '*' }).sum({ monto: 'v.total' }).groupBy('v.medio_pago').orderBy('monto', 'desc'),
    vigentes().select('v.fecha').count({ ventas: '*' }).sum({ monto: 'v.total' }).groupBy('v.fecha').orderBy('v.fecha'),
    db('detalle_venta as d').join('productos as p', 'p.id', 'd.producto_id').whereIn('d.venta_id', vigentes().select('v.id'))
      .select('p.id', 'p.codigo', 'p.nombre').sum({ unidades: 'd.cantidad' }).sum({ ingresos: 'd.subtotal' })
      .select(db.raw('sum(d.cantidad * p.precio_compra) as costo'))
      .groupBy('p.id', 'p.codigo', 'p.nombre').orderBy('ingresos', 'desc').limit(10),
    vigentes().join('usuarios as u', 'u.id', 'v.usuario_id').select('u.nombre').count({ ventas: '*' }).sum({ monto: 'v.total' })
      .groupBy('u.id', 'u.nombre').orderBy('monto', 'desc'),
    db('detalle_venta as d').join('productos as p', 'p.id', 'd.producto_id').join('categorias as c', 'c.id', 'p.categoria_id')
      .whereIn('d.venta_id', vigentes().select('v.id')).select('c.nombre').sum({ ingresos: 'd.subtotal' })
      .groupBy('c.id', 'c.nombre').orderBy('ingresos', 'desc'),
  ]);

  const ventas = aNum(resumen.ventas);
  const monto = aNum(resumen.monto);
  res.json({
    desde,
    hasta,
    resumen: {
      ventas, monto, ticket_promedio: ventas ? Math.round(monto / ventas) : 0,
      por_cobrar: aNum(resumen.saldo), anuladas: aNum(anuladas.n), monto_anulado: aNum(anuladas.monto),
    },
    por_medio_pago: porMedio.map((r) => ({ medio_pago: r.medio_pago, ventas: aNum(r.ventas), monto: aNum(r.monto) })),
    por_dia: porDia.map((r) => ({ fecha: String(r.fecha).slice(0, 10), ventas: aNum(r.ventas), monto: aNum(r.monto) })),
    top_productos: top.map((r) => ({
      ...r, unidades: aNum(r.unidades), ingresos: aNum(r.ingresos), utilidad: aNum(r.ingresos) - aNum(r.costo), costo: undefined,
    })),
    por_vendedor: porVendedor.map((r) => ({ nombre: r.nombre, ventas: aNum(r.ventas), monto: aNum(r.monto) })),
    por_categoria: porCategoria.map((r) => ({ categoria: r.nombre, ingresos: aNum(r.ingresos) })),
  });
});

module.exports = router;
