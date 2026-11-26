/**
 * Ventas (RF07 a RF10): registro con descuento FEFO, ventas a crédito, abonos y anulación.
 * Todas las operaciones se ejecutan en una transacción: o se aplica todo o no se aplica nada.
 */
const crypto = require('crypto');
const db = require('../../db/knex');
const AppError = require('../../utils/AppError');
const { insertarId, paraActualizar, aNum } = require('../../utils/bd');
const { registrarAuditoria } = require('../../utils/auditoria');
const { hoy, horaActual } = require('../../utils/fechas');
const { descontarFEFO } = require('../inventario/inventario.servicio');

const consecutivo = (id) => `V-${String(id).padStart(4, '0')}`;

/** Agrupa ítems repetidos del carrito: [{producto_id, cantidad}] → Map(producto_id → cantidad). */
function consolidar(items) {
  const mapa = new Map();
  for (const { producto_id, cantidad } of items) mapa.set(producto_id, (mapa.get(producto_id) || 0) + cantidad);
  return mapa;
}

async function crear(datos, usuario, { fecha = hoy(), hora = horaActual(), ip } = {}) {
  const ventaId = await db.transaction(async (trx) => {
    const cantidades = consolidar(datos.items);
    const ids = [...cantidades.keys()];
    const productos = await paraActualizar(trx('productos').whereIn('id', ids));
    const porId = new Map(productos.map((p) => [p.id, p]));

    // 1. Validaciones de negocio antes de modificar datos.
    const faltantes = ids.filter((id) => !porId.has(id) || !porId.get(id).activo);
    if (faltantes.length) throw AppError.unprocessable('Hay productos inexistentes o desactivados en la venta', faltantes.map((id) => ({ producto_id: id })));

    let cliente = null;
    if (datos.cliente_id) {
      cliente = await trx('clientes').where({ id: datos.cliente_id }).first();
      if (!cliente || !cliente.activo) throw AppError.unprocessable('El cliente no existe o está desactivado');
    }
    const esCredito = datos.medio_pago === 'credito';
    if (esCredito && !cliente) {
      throw AppError.unprocessable('Las ventas a crédito requieren un cliente registrado', [{ campo: 'cliente_id', mensaje: 'Obligatorio para crédito' }]);
    }

    const lineas = ids.map((id) => {
      const p = porId.get(id);
      const cantidad = cantidades.get(id);
      return { producto: p, cantidad, precio: aNum(p.precio_venta), subtotal: cantidad * aNum(p.precio_venta) };
    });
    const total = lineas.reduce((s, l) => s + l.subtotal, 0);
    const abonoInicial = esCredito ? datos.abono_inicial || 0 : 0;
    if (abonoInicial >= total && esCredito) throw AppError.unprocessable('El abono inicial debe ser menor que el total; si paga todo, registre la venta de contado');

    // 2. Encabezado de la venta (el consecutivo se deriva del id: libre de colisiones).
    const id = await insertarId(trx, 'ventas', {
      consecutivo: `T-${crypto.randomBytes(4).toString('hex')}`,
      cliente_id: cliente ? cliente.id : null,
      usuario_id: usuario.id,
      fecha,
      hora,
      medio_pago: datos.medio_pago,
      estado: esCredito ? 'pendiente' : 'pagada',
      total,
      saldo: esCredito ? total - abonoInicial : 0,
      observacion: datos.observacion || null,
    });
    await trx('ventas').where({ id }).update({ consecutivo: consecutivo(id) });

    // 3. Detalle y descuento de inventario por lotes (FEFO).
    const sinStock = [];
    for (const l of lineas) {
      const r = await descontarFEFO(trx, l.producto.id, l.cantidad, { fecha });
      if (!r.ok) {
        sinStock.push({ producto_id: l.producto.id, producto: l.producto.nombre, solicitado: l.cantidad, disponible: r.disponible });
        continue;
      }
      await trx('detalle_venta').insert({ venta_id: id, producto_id: l.producto.id, cantidad: l.cantidad, precio_unitario: l.precio, subtotal: l.subtotal });
      await trx('movimientos_inventario').insert(r.asignacion.map((a) => ({
        lote_id: a.lote_id, producto_id: l.producto.id, usuario_id: usuario.id, tipo: 'venta', cantidad: -a.cantidad, venta_id: id, fecha,
      })));
    }
    if (sinStock.length) {
      // Se revierte toda la transacción y se informa cada producto sin existencias vigentes.
      throw new AppError(409, 'STOCK_INSUFICIENTE', 'No hay existencias suficientes para completar la venta', sinStock);
    }

    if (abonoInicial > 0) {
      await trx('abonos').insert({ venta_id: id, usuario_id: usuario.id, valor: abonoInicial, medio_pago: datos.medio_pago_abono || 'efectivo', fecha });
    }
    await registrarAuditoria(trx, { usuarioId: usuario.id, accion: 'CREAR', entidad: 'venta', entidadId: id, detalle: { total, medio_pago: datos.medio_pago }, ip });
    return id;
  });
  return obtener(ventaId);
}

async function obtener(id, conexion = db) {
  const v = await conexion('ventas as v')
    .leftJoin('clientes as c', 'c.id', 'v.cliente_id')
    .join('usuarios as u', 'u.id', 'v.usuario_id')
    .leftJoin('usuarios as ua', 'ua.id', 'v.anulada_por')
    .select('v.*', 'c.nombre as cliente', 'c.documento as cliente_documento', 'u.nombre as vendedor', 'ua.nombre as anulada_por_nombre')
    .where('v.id', id).first();
  if (!v) throw AppError.notFound('Venta');
  const items = await conexion('detalle_venta as d').join('productos as p', 'p.id', 'd.producto_id')
    .select('d.*', 'p.codigo', 'p.nombre as producto', 'p.presentacion').where('d.venta_id', id).orderBy('d.id');
  const abonos = await conexion('abonos as a').join('usuarios as u', 'u.id', 'a.usuario_id')
    .select('a.*', 'u.nombre as usuario').where('a.venta_id', id).orderBy('a.id');
  const lotes = await conexion('movimientos_inventario as m').join('lotes as l', 'l.id', 'm.lote_id')
    .select('m.producto_id', 'm.lote_id', 'm.cantidad', 'm.tipo', 'l.fecha_vencimiento', 'l.codigo_lote')
    .where('m.venta_id', id).orderBy('m.id');
  return {
    ...v,
    total: aNum(v.total),
    saldo: aNum(v.saldo),
    items: items.map((i) => ({ ...i, cantidad: aNum(i.cantidad), precio_unitario: aNum(i.precio_unitario), subtotal: aNum(i.subtotal) })),
    abonos: abonos.map((a) => ({ ...a, valor: aNum(a.valor) })),
    lotes,
  };
}

async function anular(id, motivo, usuario, ip) {
  await db.transaction(async (trx) => {
    const venta = await paraActualizar(trx('ventas').where({ id })).first();
    if (!venta) throw AppError.notFound('Venta');
    if (venta.estado === 'anulada') throw AppError.conflict('La venta ya está anulada');

    // Reintegra cada unidad al mismo lote del que salió (trazabilidad exacta).
    const salidas = await trx('movimientos_inventario').where({ venta_id: id, tipo: 'venta' });
    const fecha = hoy();
    for (const m of salidas) {
      const cantidad = Math.abs(aNum(m.cantidad));
      await trx('lotes').where({ id: m.lote_id }).update({ cantidad_disponible: trx.raw('cantidad_disponible + ?', [cantidad]) });
      await trx('productos').where({ id: m.producto_id }).update({ stock: trx.raw('stock + ?', [cantidad]) });
    }
    if (salidas.length) {
      await trx('movimientos_inventario').insert(salidas.map((m) => ({
        lote_id: m.lote_id, producto_id: m.producto_id, usuario_id: usuario.id, tipo: 'anulacion',
        cantidad: Math.abs(aNum(m.cantidad)), motivo, venta_id: id, fecha,
      })));
    }
    await trx('ventas').where({ id }).update({
      estado: 'anulada', saldo: 0, motivo_anulacion: motivo, anulada_por: usuario.id, anulada_en: trx.fn.now(),
    });
    await registrarAuditoria(trx, { usuarioId: usuario.id, accion: 'ANULAR', entidad: 'venta', entidadId: id, detalle: { consecutivo: venta.consecutivo, total: aNum(venta.total), motivo }, ip });
  });
  return obtener(id);
}

async function abonar(id, { valor, medio_pago }, usuario, ip) {
  await db.transaction(async (trx) => {
    const venta = await paraActualizar(trx('ventas').where({ id })).first();
    if (!venta) throw AppError.notFound('Venta');
    if (venta.estado !== 'pendiente') throw AppError.unprocessable('Solo se pueden registrar abonos a ventas pendientes de pago');
    const saldo = aNum(venta.saldo);
    if (valor > saldo) throw AppError.unprocessable(`El abono supera el saldo pendiente (${saldo})`, [{ campo: 'valor', mensaje: `Máximo ${saldo}` }]);

    await trx('abonos').insert({ venta_id: id, usuario_id: usuario.id, valor, medio_pago, fecha: hoy() });
    const nuevoSaldo = saldo - valor;
    await trx('ventas').where({ id }).update({ saldo: nuevoSaldo, estado: nuevoSaldo === 0 ? 'pagada' : 'pendiente' });
    await registrarAuditoria(trx, { usuarioId: usuario.id, accion: 'ABONO', entidad: 'venta', entidadId: id, detalle: { valor, saldo: nuevoSaldo }, ip });
  });
  return obtener(id);
}

/** Aplica los filtros del historial a una consulta sobre ventas (alias v). */
function filtrar(q, f) {
  if (f.desde) q.where('v.fecha', '>=', f.desde);
  if (f.hasta) q.where('v.fecha', '<=', f.hasta);
  if (f.estado) q.where('v.estado', f.estado);
  if (f.cliente_id) q.where('v.cliente_id', f.cliente_id);
  if (f.medio_pago) q.where('v.medio_pago', f.medio_pago);
  if (f.buscar) {
    const b = `%${f.buscar.toLowerCase()}%`;
    q.where((w) => w
      .whereRaw('lower(v.consecutivo) like ?', [b])
      .orWhereExists(db('clientes as cb').whereRaw('cb.id = v.cliente_id').whereRaw('lower(cb.nombre) like ?', [b]))
      .orWhereExists(db('detalle_venta as db2').join('productos as pb', 'pb.id', 'db2.producto_id')
        .whereRaw('db2.venta_id = v.id').whereRaw('lower(pb.nombre) like ?', [b])));
  }
  return q;
}

async function listar(filtros, pag) {
  const base = () => filtrar(db('ventas as v'), filtros);
  const [{ total }] = await base().count({ total: '*' });

  const filas = await base()
    .leftJoin('clientes as c', 'c.id', 'v.cliente_id')
    .join('usuarios as u', 'u.id', 'v.usuario_id')
    .select('v.id', 'v.consecutivo', 'v.fecha', 'v.hora', 'v.medio_pago', 'v.estado', 'v.total', 'v.saldo', 'c.nombre as cliente', 'u.nombre as vendedor')
    .orderBy('v.fecha', 'desc').orderBy('v.hora', 'desc').orderBy('v.id', 'desc')
    .limit(pag.limite).offset(pag.offset);

  // Resumen de productos de la página en una sola consulta (evita N+1 consultas).
  const ids = filas.map((f) => f.id);
  const detalles = ids.length
    ? await db('detalle_venta as d').join('productos as p', 'p.id', 'd.producto_id')
      .select('d.venta_id', 'd.cantidad', 'p.nombre').whereIn('d.venta_id', ids).orderBy('d.id')
    : [];
  const porVenta = new Map();
  for (const d of detalles) {
    const r = porVenta.get(d.venta_id) || { nombres: [], unidades: 0 };
    r.nombres.push(aNum(d.cantidad) > 1 ? `${d.nombre} x${d.cantidad}` : d.nombre);
    r.unidades += aNum(d.cantidad);
    porVenta.set(d.venta_id, r);
  }

  // Indicadores del período filtrado (sin contar anuladas).
  const vigentes = base().whereNot('v.estado', 'anulada');
  const [agg] = await vigentes.clone().count({ cantidad: '*' }).sum({ monto: 'v.total' });
  const [top] = await db('detalle_venta as d').join('productos as p', 'p.id', 'd.producto_id')
    .whereIn('d.venta_id', vigentes.clone().select('v.id'))
    .select('p.nombre').sum({ unidades: 'd.cantidad' }).groupBy('p.id', 'p.nombre').orderBy('unidades', 'desc').limit(1);

  const cantidad = aNum(agg.cantidad);
  const monto = aNum(agg.monto);
  return {
    filas: filas.map((f) => ({
      ...f,
      total: aNum(f.total),
      saldo: aNum(f.saldo),
      productos: (porVenta.get(f.id)?.nombres || []).join(' + '),
      unidades: porVenta.get(f.id)?.unidades || 0,
    })),
    total: aNum(total),
    resumen: {
      ventas: cantidad,
      monto,
      ticket_promedio: cantidad ? Math.round(monto / cantidad) : 0,
      producto_top: top ? top.nombre : null,
    },
  };
}

module.exports = { crear, obtener, anular, abonar, listar, consolidar };
