/**
 * Lógica de negocio de productos (RF03, RF15).
 */
const db = require('../../db/knex');
const AppError = require('../../utils/AppError');
const { insertarId, aBool, aNum } = require('../../utils/bd');
const { registrarAuditoria } = require('../../utils/auditoria');
const { hoy } = require('../../utils/fechas');

/** Regla de negocio: precio de venta = precio de compra × (1 + margen/100), redondeado a la centena. */
function calcularPrecioVenta(precioCompra, margen) {
  return Math.round((precioCompra * (1 + margen / 100)) / 100) * 100;
}

const ORDENES = { nombre: 'p.nombre', codigo: 'p.codigo', stock: 'p.stock', precio: 'p.precio_venta', categoria: 'c.nombre' };

function mapear(p) {
  return {
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    categoria_id: p.categoria_id,
    categoria: p.categoria,
    icono: p.icono,
    proveedor_id: p.proveedor_id,
    proveedor: p.proveedor,
    presentacion: p.presentacion,
    unidad: p.unidad,
    precio_compra: aNum(p.precio_compra),
    margen: aNum(p.margen),
    precio_venta: aNum(p.precio_venta),
    stock: aNum(p.stock),
    stock_minimo: aNum(p.stock_minimo),
    bajo_stock: aNum(p.stock) <= aNum(p.stock_minimo),
    proximo_vencimiento: p.proximo_vencimiento || null,
    descripcion: p.descripcion,
    activo: aBool(p.activo),
  };
}

function consultaBase() {
  return db('productos as p')
    .join('categorias as c', 'c.id', 'p.categoria_id')
    .leftJoin('proveedores as pr', 'pr.id', 'p.proveedor_id')
    .select('p.*', 'c.nombre as categoria', 'c.icono', 'pr.razon_social as proveedor')
    .select(db.raw('(select min(l.fecha_vencimiento) from lotes l where l.producto_id = p.id and l.cantidad_disponible > 0) as proximo_vencimiento'));
}

function aplicarFiltros(q, f) {
  if (f.activo !== 'todos') q.where('p.activo', f.activo !== 'false');
  if (f.buscar) {
    const b = `%${f.buscar.toLowerCase()}%`;
    q.where((w) => w.whereRaw('lower(p.nombre) like ?', [b]).orWhereRaw('lower(p.codigo) like ?', [b]));
  }
  if (f.estado === 'bajo') q.whereRaw('p.stock <= p.stock_minimo');
  if (f.estado === 'ok') q.whereRaw('p.stock > p.stock_minimo');
  return q;
}

async function listar(filtros, pag) {
  const q = aplicarFiltros(consultaBase(), filtros);
  if (filtros.categoria_id) q.where('p.categoria_id', filtros.categoria_id);

  const conteo = aplicarFiltros(db('productos as p'), filtros);
  if (filtros.categoria_id) conteo.where('p.categoria_id', filtros.categoria_id);
  const [{ total }] = await conteo.count({ total: '*' });

  // Conteo por categoría para las pestañas del listado (sin filtro de categoría).
  const porCategoria = await aplicarFiltros(db('productos as p'), filtros)
    .select('p.categoria_id').count({ total: '*' }).groupBy('p.categoria_id');

  const columna = ORDENES[filtros.orden] || 'p.nombre';
  const dir = filtros.dir === 'desc' ? 'desc' : 'asc';
  const filas = await q.orderBy(columna, dir).orderBy('p.id').limit(pag.limite).offset(pag.offset);

  return {
    filas: filas.map(mapear),
    total: aNum(total),
    porCategoria: Object.fromEntries(porCategoria.map((r) => [r.categoria_id, aNum(r.total)])),
  };
}

async function obtener(id) {
  const p = await consultaBase().where('p.id', id).first();
  if (!p) throw AppError.notFound('Producto');
  const lotes = await db('lotes as l').leftJoin('proveedores as pr', 'pr.id', 'l.proveedor_id')
    .select('l.*', 'pr.razon_social as proveedor')
    .where('l.producto_id', id).where('l.cantidad_disponible', '>', 0)
    .orderByRaw('case when l.fecha_vencimiento is null then 1 else 0 end').orderBy('l.fecha_vencimiento').orderBy('l.id');
  return { ...mapear(p), lotes };
}

async function validarRelaciones(trx, { categoria_id, proveedor_id }) {
  if (categoria_id && !(await trx('categorias').where({ id: categoria_id }).first())) {
    throw new AppError(400, 'VALIDACION', 'La categoría no existe', [{ campo: 'categoria_id', mensaje: 'Categoría no existe' }]);
  }
  if (proveedor_id && !(await trx('proveedores').where({ id: proveedor_id }).first())) {
    throw new AppError(400, 'VALIDACION', 'El proveedor no existe', [{ campo: 'proveedor_id', mensaje: 'Proveedor no existe' }]);
  }
}

async function existeCodigo(trx, codigo, exceptoId) {
  const q = trx('productos').whereRaw('lower(codigo) = ?', [codigo.toLowerCase()]);
  if (exceptoId) q.whereNot('id', exceptoId);
  return Boolean(await q.first());
}

async function crearEnTransaccion(trx, datos, usuario, ip) {
  const { stock_inicial = 0, fecha_vencimiento = null, ...producto } = datos;
  await validarRelaciones(trx, producto);
  if (await existeCodigo(trx, producto.codigo)) {
    throw AppError.conflict(`Ya existe un producto con el código ${producto.codigo}`, [{ campo: 'codigo', mensaje: 'Código duplicado' }]);
  }
  const precioVenta = producto.precio_venta || calcularPrecioVenta(producto.precio_compra, producto.margen);
  if (precioVenta < producto.precio_compra) {
    throw AppError.unprocessable('El precio de venta no puede ser menor que el precio de compra', [{ campo: 'precio_venta', mensaje: 'Menor que el precio de compra' }]);
  }
  const id = await insertarId(trx, 'productos', { ...producto, precio_venta: precioVenta, stock: 0, activo: true });

  if (stock_inicial > 0) {
    const fecha = hoy();
    const loteId = await insertarId(trx, 'lotes', {
      producto_id: id, proveedor_id: producto.proveedor_id || null, cantidad_inicial: stock_inicial,
      cantidad_disponible: stock_inicial, costo_unitario: producto.precio_compra, fecha_ingreso: fecha,
      fecha_vencimiento, usuario_id: usuario.id,
    });
    await trx('movimientos_inventario').insert({
      lote_id: loteId, producto_id: id, usuario_id: usuario.id, tipo: 'entrada', cantidad: stock_inicial, motivo: 'Stock inicial', fecha,
    });
    await trx('productos').where({ id }).update({ stock: stock_inicial });
  }
  await registrarAuditoria(trx, { usuarioId: usuario.id, accion: 'CREAR', entidad: 'producto', entidadId: id, detalle: { codigo: producto.codigo, precio_venta: precioVenta }, ip });
  return id;
}

async function crear(datos, usuario, ip) {
  const id = await db.transaction((trx) => crearEnTransaccion(trx, datos, usuario, ip));
  return obtener(id);
}

async function actualizar(id, datos, usuario, ip) {
  await db.transaction(async (trx) => {
    const actual = await trx('productos').where({ id }).first();
    if (!actual) throw AppError.notFound('Producto');
    await validarRelaciones(trx, datos);
    if (datos.codigo && (await existeCodigo(trx, datos.codigo, id))) {
      throw AppError.conflict(`Ya existe un producto con el código ${datos.codigo}`, [{ campo: 'codigo', mensaje: 'Código duplicado' }]);
    }
    const compra = datos.precio_compra ?? aNum(actual.precio_compra);
    const margen = datos.margen ?? aNum(actual.margen);
    let venta = datos.precio_venta;
    if (venta === undefined && (datos.precio_compra !== undefined || datos.margen !== undefined)) {
      venta = calcularPrecioVenta(compra, margen);
    }
    venta = venta ?? aNum(actual.precio_venta);
    if (venta < compra) throw AppError.unprocessable('El precio de venta no puede ser menor que el precio de compra');

    await trx('productos').where({ id }).update({ ...datos, precio_venta: venta, updated_at: trx.fn.now() });
    const cambioPrecio = venta !== aNum(actual.precio_venta) || compra !== aNum(actual.precio_compra);
    await registrarAuditoria(trx, {
      usuarioId: usuario.id, accion: cambioPrecio ? 'CAMBIO_PRECIO' : 'EDITAR', entidad: 'producto', entidadId: id,
      detalle: cambioPrecio ? { antes: { compra: aNum(actual.precio_compra), venta: aNum(actual.precio_venta) }, despues: { compra, venta } } : datos,
      ip,
    });
  });
  return obtener(id);
}

/** Los productos no se eliminan físicamente: se desactivan para conservar la trazabilidad. */
async function desactivar(id, usuario, ip) {
  await db.transaction(async (trx) => {
    const actual = await trx('productos').where({ id }).first();
    if (!actual) throw AppError.notFound('Producto');
    await trx('productos').where({ id }).update({ activo: false, updated_at: trx.fn.now() });
    await registrarAuditoria(trx, { usuarioId: usuario.id, accion: 'DESACTIVAR', entidad: 'producto', entidadId: id, detalle: { codigo: actual.codigo }, ip });
  });
}

/**
 * Importación masiva desde CSV (RF15): procesa cada fila de forma independiente
 * (un error en una fila no impide registrar las demás) y reporta el resultado.
 */
async function importar(filas, usuario, ip) {
  const categorias = await db('categorias').select('id', 'nombre');
  const porNombre = new Map(categorias.map((c) => [c.nombre.toLowerCase(), c.id]));
  const resultado = { creados: 0, errores: [] };

  for (const [i, fila] of filas.entries()) {
    const categoriaId = porNombre.get(String(fila.categoria || '').toLowerCase());
    if (!categoriaId) {
      resultado.errores.push({ fila: i + 2, codigo: fila.codigo, mensaje: `Categoría "${fila.categoria}" no existe` });
      continue;
    }
    try {
      const { categoria, ...resto } = fila;
      await db.transaction((trx) => crearEnTransaccion(trx, { ...resto, categoria_id: categoriaId }, usuario, ip));
      resultado.creados += 1;
    } catch (err) {
      resultado.errores.push({ fila: i + 2, codigo: fila.codigo, mensaje: err.message });
    }
  }
  return resultado;
}

module.exports = { listar, obtener, crear, actualizar, desactivar, importar, calcularPrecioVenta, consultaBase, mapear };
