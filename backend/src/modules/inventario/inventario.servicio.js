/**
 * Inventario por lotes (RF04, RF05, RF06).
 * Cada lote guarda su fecha de vencimiento; las salidas siguen la política FEFO
 * (First Expired, First Out): primero sale lo que vence primero.
 */
const db = require('../../db/knex');
const AppError = require('../../utils/AppError');
const { insertarId, paraActualizar, aNum } = require('../../utils/bd');
const { registrarAuditoria } = require('../../utils/auditoria');
const { hoy, sumarDias } = require('../../utils/fechas');

/**
 * Lotes disponibles de un producto en orden FEFO.
 * @param {boolean} soloVigentes excluye lotes vencidos a la fecha indicada (para ventas).
 */
function lotesFEFO(trx, productoId, { fecha = hoy(), soloVigentes = true } = {}) {
  const q = trx('lotes')
    .where({ producto_id: productoId })
    .where('cantidad_disponible', '>', 0)
    .orderByRaw('case when fecha_vencimiento is null then 1 else 0 end')
    .orderBy('fecha_vencimiento')
    .orderBy('fecha_ingreso')
    .orderBy('id');
  if (soloVigentes) q.where((w) => w.whereNull('fecha_vencimiento').orWhere('fecha_vencimiento', '>=', fecha));
  return paraActualizar(q);
}

/**
 * Descuenta una cantidad de los lotes de un producto siguiendo FEFO.
 * Algoritmo voraz: recorre los lotes ordenados y toma de cada uno lo necesario.
 * Complejidad O(n) sobre los lotes del producto. Devuelve la asignación por lote.
 */
async function descontarFEFO(trx, productoId, cantidad, opciones) {
  const lotes = await lotesFEFO(trx, productoId, opciones);
  const disponible = lotes.reduce((s, l) => s + aNum(l.cantidad_disponible), 0);
  if (disponible < cantidad) return { ok: false, disponible };

  const asignacion = [];
  let pendiente = cantidad;
  for (const lote of lotes) {
    if (pendiente === 0) break;
    const tomar = Math.min(pendiente, aNum(lote.cantidad_disponible));
    // La condición en el WHERE evita inventario negativo aun con solicitudes concurrentes.
    const filas = await trx('lotes')
      .where('id', lote.id)
      .where('cantidad_disponible', '>=', tomar)
      .update({ cantidad_disponible: trx.raw('cantidad_disponible - ?', [tomar]) });
    if (filas !== 1) throw AppError.conflict('El inventario cambió durante la operación. Intente de nuevo.');
    asignacion.push({ lote_id: lote.id, cantidad: tomar });
    pendiente -= tomar;
  }
  await trx('productos').where('id', productoId).update({ stock: trx.raw('stock - ?', [cantidad]) });
  return { ok: true, asignacion, disponible };
}

async function registrarEntrada(datos, usuario, ip) {
  return db.transaction(async (trx) => {
    const producto = await trx('productos').where({ id: datos.producto_id }).first();
    if (!producto) throw AppError.notFound('Producto');
    if (!producto.activo) throw AppError.unprocessable('El producto está desactivado');
    if (datos.proveedor_id && !(await trx('proveedores').where({ id: datos.proveedor_id }).first())) {
      throw AppError.badRequest('El proveedor no existe');
    }
    const fecha = hoy();
    if (datos.fecha_vencimiento && datos.fecha_vencimiento < fecha) {
      throw AppError.unprocessable('No se puede ingresar un lote ya vencido', [{ campo: 'fecha_vencimiento', mensaje: 'Fecha anterior a hoy' }]);
    }
    const loteId = await insertarId(trx, 'lotes', {
      producto_id: datos.producto_id,
      proveedor_id: datos.proveedor_id || producto.proveedor_id || null,
      codigo_lote: datos.codigo_lote || null,
      cantidad_inicial: datos.cantidad,
      cantidad_disponible: datos.cantidad,
      costo_unitario: datos.costo_unitario ?? producto.precio_compra,
      fecha_ingreso: fecha,
      fecha_vencimiento: datos.fecha_vencimiento || null,
      usuario_id: usuario.id,
    });
    await trx('movimientos_inventario').insert({
      lote_id: loteId, producto_id: datos.producto_id, usuario_id: usuario.id, tipo: 'entrada',
      cantidad: datos.cantidad, motivo: datos.observacion || 'Entrada de mercancía', fecha,
    });
    await trx('productos').where({ id: datos.producto_id }).update({ stock: trx.raw('stock + ?', [datos.cantidad]), updated_at: trx.fn.now() });
    await registrarAuditoria(trx, { usuarioId: usuario.id, accion: 'ENTRADA', entidad: 'lote', entidadId: loteId, detalle: { producto: producto.codigo, cantidad: datos.cantidad }, ip });
    return trx('lotes').where({ id: loteId }).first();
  });
}

async function registrarAjuste(datos, usuario, ip) {
  return db.transaction(async (trx) => {
    const producto = await trx('productos').where({ id: datos.producto_id }).first();
    if (!producto) throw AppError.notFound('Producto');
    const fecha = hoy();
    const motivo = `${datos.motivo}${datos.observacion ? ': ' + datos.observacion : ''}`;
    const movimientos = [];

    if (datos.cantidad > 0) {
      // Ajuste positivo (p. ej. conteo físico mayor): se suma a un lote existente.
      if (!datos.lote_id) throw AppError.badRequest('Para un ajuste positivo indique el lote', [{ campo: 'lote_id', mensaje: 'Obligatorio' }]);
      const lote = await trx('lotes').where({ id: datos.lote_id, producto_id: datos.producto_id }).first();
      if (!lote) throw AppError.notFound('Lote');
      await trx('lotes').where({ id: lote.id }).update({ cantidad_disponible: trx.raw('cantidad_disponible + ?', [datos.cantidad]) });
      await trx('productos').where({ id: producto.id }).update({ stock: trx.raw('stock + ?', [datos.cantidad]) });
      movimientos.push({ lote_id: lote.id, cantidad: datos.cantidad });
    } else {
      const salida = Math.abs(datos.cantidad);
      if (datos.lote_id) {
        const filas = await trx('lotes').where({ id: datos.lote_id, producto_id: datos.producto_id })
          .where('cantidad_disponible', '>=', salida)
          .update({ cantidad_disponible: trx.raw('cantidad_disponible - ?', [salida]) });
        if (filas !== 1) throw AppError.unprocessable('El lote no existe o no tiene esa cantidad disponible');
        await trx('productos').where({ id: producto.id }).update({ stock: trx.raw('stock - ?', [salida]) });
        movimientos.push({ lote_id: datos.lote_id, cantidad: -salida });
      } else {
        // Sin lote: se descuenta en orden FEFO, incluyendo lotes vencidos (merma por vencimiento).
        const r = await descontarFEFO(trx, producto.id, salida, { soloVigentes: false });
        if (!r.ok) throw AppError.unprocessable(`Solo hay ${r.disponible} unidades disponibles`);
        r.asignacion.forEach((a) => movimientos.push({ lote_id: a.lote_id, cantidad: -a.cantidad }));
      }
    }

    await trx('movimientos_inventario').insert(movimientos.map((m) => ({
      ...m, producto_id: producto.id, usuario_id: usuario.id, tipo: 'ajuste', motivo, fecha,
    })));
    await registrarAuditoria(trx, { usuarioId: usuario.id, accion: 'AJUSTE', entidad: 'producto', entidadId: producto.id, detalle: { cantidad: datos.cantidad, motivo }, ip });
    const actualizado = await trx('productos').where({ id: producto.id }).first();
    return { producto_id: producto.id, stock: aNum(actualizado.stock), movimientos };
  });
}

/** Alertas de inventario: bajo stock, lotes por vencer y lotes vencidos (RF06). */
async function alertas(dias = 7) {
  const fecha = hoy();
  const limite = sumarDias(fecha, dias);
  const bajoStock = await db('productos as p').join('categorias as c', 'c.id', 'p.categoria_id')
    .select('p.id', 'p.codigo', 'p.nombre', 'p.presentacion', 'p.unidad', 'p.stock', 'p.stock_minimo', 'c.nombre as categoria')
    .where('p.activo', true).whereRaw('p.stock <= p.stock_minimo')
    .orderByRaw('(p.stock * 1.0) / (case when p.stock_minimo = 0 then 1 else p.stock_minimo end)');

  const lotes = (desde, hasta) => {
    const q = db('lotes as l').join('productos as p', 'p.id', 'l.producto_id')
      .select('l.id', 'l.codigo_lote', 'l.cantidad_disponible', 'l.fecha_vencimiento', 'l.fecha_ingreso', 'p.id as producto_id', 'p.codigo', 'p.nombre', 'p.unidad')
      .where('l.cantidad_disponible', '>', 0).whereNotNull('l.fecha_vencimiento').orderBy('l.fecha_vencimiento');
    if (desde) q.where('l.fecha_vencimiento', '>=', desde);
    if (hasta) q.where('l.fecha_vencimiento', hasta === fecha ? '<' : '<=', hasta);
    return q;
  };

  const porVencer = await lotes(fecha, limite);
  const vencidos = await lotes(null, fecha);
  const dif = (f) => Math.round((new Date(`${f}T12:00:00Z`) - new Date(`${fecha}T12:00:00Z`)) / 86400000);

  return {
    fecha,
    dias,
    bajo_stock: bajoStock.map((p) => ({ ...p, stock: aNum(p.stock), stock_minimo: aNum(p.stock_minimo) })),
    por_vencer: porVencer.map((l) => ({ ...l, dias_restantes: dif(l.fecha_vencimiento) })),
    vencidos: vencidos.map((l) => ({ ...l, dias_restantes: dif(l.fecha_vencimiento) })),
  };
}

module.exports = { lotesFEFO, descontarFEFO, registrarEntrada, registrarAjuste, alertas };
