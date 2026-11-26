/**
 * Panel de control (RF13): indicadores del día, alertas y serie de ventas.
 */
const { Router } = require('express');
const { z } = require('zod');
const db = require('../../db/knex');
const validar = require('../../middlewares/validar');
const { aNum } = require('../../utils/bd');
const { hoy, sumarDias, rangoFechas } = require('../../utils/fechas');

const router = Router();
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const etiqueta = (f) => `${Number(f.slice(8, 10))} ${MESES[Number(f.slice(5, 7)) - 1]}`;

async function ventasDelDia(fecha) {
  const [r] = await db('ventas').where({ fecha }).whereNot('estado', 'anulada').count({ n: '*' }).sum({ monto: 'total' });
  return { cantidad: aNum(r.n), monto: aNum(r.monto) };
}

router.get('/resumen', async (_req, res) => {
  const fecha = hoy();
  const [deHoy, deAyer] = await Promise.all([ventasDelDia(fecha), ventasDelDia(sumarDias(fecha, -1))]);

  const [[inv], [bajo], [vencer], [clientes], [cartera]] = await Promise.all([
    db('productos').where('activo', true).count({ refs: '*' }).sum({ unidades: 'stock' }),
    db('productos').where('activo', true).whereRaw('stock <= stock_minimo').count({ n: '*' }),
    db('lotes').where('cantidad_disponible', '>', 0).whereBetween('fecha_vencimiento', [fecha, sumarDias(fecha, 7)]).count({ n: '*' }),
    db('ventas').where('fecha', '>=', sumarDias(fecha, -30)).whereNot('estado', 'anulada').whereNotNull('cliente_id').countDistinct({ n: 'cliente_id' }),
    db('ventas').where('estado', 'pendiente').count({ n: '*' }).sum({ saldo: 'saldo' }),
  ]);

  const bajoStock = await db('productos').select('id', 'codigo', 'nombre', 'presentacion', 'unidad', 'stock', 'stock_minimo')
    .where('activo', true).whereRaw('stock <= stock_minimo')
    .orderByRaw('(stock * 1.0) / (case when stock_minimo = 0 then 1 else stock_minimo end)').limit(5);

  const recientes = await db('ventas as v').leftJoin('clientes as c', 'c.id', 'v.cliente_id')
    .select('v.id', 'v.consecutivo', 'v.fecha', 'v.hora', 'v.total', 'v.estado', 'c.nombre as cliente')
    .orderBy('v.id', 'desc').limit(6);
  const det = recientes.length
    ? await db('detalle_venta as d').join('productos as p', 'p.id', 'd.producto_id')
      .select('d.venta_id', 'd.cantidad', 'p.nombre').whereIn('d.venta_id', recientes.map((r) => r.id))
    : [];

  const variacion = deAyer.monto ? Math.round(((deHoy.monto - deAyer.monto) / deAyer.monto) * 100) : null;
  res.json({
    fecha,
    ventas_hoy: { ...deHoy, variacion_vs_ayer: variacion },
    inventario: { referencias: aNum(inv.refs), unidades: aNum(inv.unidades), bajo_stock: aNum(bajo.n), lotes_por_vencer: aNum(vencer.n) },
    clientes_activos_30_dias: aNum(clientes.n),
    cartera: { ventas: aNum(cartera.n), saldo: aNum(cartera.saldo) },
    bajo_stock: bajoStock.map((p) => ({ ...p, stock: aNum(p.stock), stock_minimo: aNum(p.stock_minimo) })),
    ventas_recientes: recientes.map((v) => ({
      ...v,
      total: aNum(v.total),
      productos: det.filter((d) => d.venta_id === v.id).map((d) => d.nombre).join(' + '),
      unidades: det.filter((d) => d.venta_id === v.id).reduce((s, d) => s + aNum(d.cantidad), 0),
    })),
  });
});

/**
 * Serie de ventas: 7 y 30 días por día; 90 días agrupado por semana.
 * La agregación se hace en SQL (GROUP BY fecha) y se completan con cero los días sin ventas.
 */
router.get('/ventas', validar(z.object({ periodo: z.enum(['7d', '30d', '90d']).default('7d') }), 'query'), async (req, res) => {
  const { periodo } = req.validQuery;
  const dias = { '7d': 7, '30d': 30, '90d': 91 }[periodo];
  const hasta = hoy();
  const desde = sumarDias(hasta, -(dias - 1));

  const filas = await db('ventas').select('fecha').sum({ monto: 'total' }).count({ n: '*' })
    .whereBetween('fecha', [desde, hasta]).whereNot('estado', 'anulada').groupBy('fecha');
  const porFecha = new Map(filas.map((f) => [String(f.fecha).slice(0, 10), { monto: aNum(f.monto), n: aNum(f.n) }]));
  const fechas = rangoFechas(desde, hasta);

  let etiquetas;
  let valores;
  let cantidades;
  if (periodo === '90d') {
    etiquetas = []; valores = []; cantidades = [];
    for (let i = 0; i < fechas.length; i += 7) {
      const semana = fechas.slice(i, i + 7);
      etiquetas.push(`Sem. ${etiqueta(semana[0])}`);
      valores.push(semana.reduce((s, f) => s + (porFecha.get(f)?.monto || 0), 0));
      cantidades.push(semana.reduce((s, f) => s + (porFecha.get(f)?.n || 0), 0));
    }
  } else {
    etiquetas = fechas.map((f) => (f === hasta ? 'Hoy' : etiqueta(f)));
    valores = fechas.map((f) => porFecha.get(f)?.monto || 0);
    cantidades = fechas.map((f) => porFecha.get(f)?.n || 0);
  }
  res.json({ periodo, desde, hasta, etiquetas, valores, cantidades, total: valores.reduce((a, b) => a + b, 0) });
});

module.exports = router;
