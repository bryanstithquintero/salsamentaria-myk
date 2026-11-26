/**
 * Datos de demostración de la Salsamentaria MYK.
 * Genera 90 días de historial de ventas coherente con el inventario por lotes:
 * cada unidad vendida sale de un lote, y las existencias actuales son la suma de
 * lo que queda disponible en los lotes. Los datos son ficticios.
 */
const bcrypt = require('bcryptjs');
const { hoy, sumarDias, horaActual } = require('../../utils/fechas');

// Generador pseudoaleatorio determinístico (mulberry32): mismos datos en cada ejecución.
function crearAzar(semilla) {
  let a = semilla;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PRODUCTOS = [
  // codigo, nombre, cat, presentacion, unidad, compra, venta, minimo, proveedor, stock objetivo, días para vencer el lote actual
  ['CHO-001', 'Chorizo Santarrosano', 1, 'Paquete x 500 g', 'paquete', 4200, 5600, 5, 1, 3, 12, 'Chorizo artesanal de la región, empacado al vacío. Producto refrigerado.'],
  ['SAL-022', 'Salchicha ranchera', 1, 'Paquete x 6', 'paquete', 3800, 5200, 5, 1, 2, 15, 'Salchicha de cerdo y res, lista para cocinar. Ideal para asados.'],
  ['QSO-014', 'Queso campesino', 2, 'Libra', 'libra', 6500, 9800, 8, 2, 4, 3, 'Queso fresco artesanal, sabor suave y cremoso, sin conservantes.'],
  ['QSO-007', 'Queso doble crema', 2, '250 g', 'unidad', 5400, 7900, 10, 2, 5, 6, 'Queso doble crema de alta calidad, suave y derretible.'],
  ['CHO-003', 'Chorizo paisa', 1, 'Paquete x 500 g', 'paquete', 4100, 5500, 5, 1, 18, 20, 'Chorizo paisa de primera selección, sabor ahumado característico.'],
  ['SAL-001', 'Salchichón cervecero', 1, 'Libra', 'libra', 5900, 7400, 5, 1, 22, 35, 'Salchichón de res y cerdo con especias seleccionadas.'],
  ['QSO-001', 'Queso mozzarella', 2, '500 g', 'unidad', 7200, 10500, 5, 2, 14, 18, 'Queso mozzarella fresco para pizzas, lasañas y gratinados.'],
  ['LCT-005', 'Yogurt natural 1L', 2, 'Botella 1L', 'botella', 3400, 4800, 5, 2, 32, 5, 'Yogurt natural sin azúcar añadida, elaborado con leche entera.'],
  ['CHO-005', 'Longaniza ahumada', 1, 'Paquete x 500 g', 'paquete', 4800, 6200, 5, 1, 12, 25, 'Longaniza artesanal con proceso de ahumado tradicional.'],
  ['LCT-002', 'Mantequilla casera', 2, '250 g', 'unidad', 5200, 7800, 5, 2, 8, 40, 'Mantequilla de nata fresca, elaborada de forma artesanal.'],
  ['OTR-001', 'Chicharrón prensado', 3, 'Paquete 200 g', 'paquete', 3200, 4500, 5, 3, 15, 60, 'Chicharrón prensado tradicional, crujiente y sabroso.'],
  ['JAM-001', 'Jamón de cerdo', 1, 'Paquete x 250 g', 'paquete', 5600, 7600, 6, 1, 20, 14, 'Jamón de cerdo tajado, ideal para sándwiches.'],
  ['LCT-008', 'Kumis 1L', 2, 'Botella 1L', 'botella', 3900, 5400, 6, 2, 10, 7, 'Kumis tradicional elaborado con leche fresca.'],
  ['OTR-004', 'Arepas de maíz x 10', 3, 'Paquete x 10', 'paquete', 2900, 4200, 8, 3, 25, 9, 'Arepas de maíz blanco precocidas, listas para asar.'],
];

const CLIENTES = [
  ['1075234567', 'María L. Ortiz', '3104567890'],
  ['7712345', 'Carlos Perdomo', '3157894561'],
  ['1075987654', 'Ana Sofía Rojas', '3209876543'],
  ['900765432-1', 'Restaurante La Cava', '6088712345'],
  ['12193456', 'Jorge E. Lozano', '3112223344'],
  ['1077456123', 'Luisa F. Cabrera', '3176543210'],
  ['901112233-4', 'Panadería El Trigal', '6088745566'],
  ['36178234', 'Rosa Elena Trujillo', '3138889900'],
];

exports.seed = async function (knex) {
  const azar = crearAzar(20261126);
  const entre = (min, max) => min + Math.floor(azar() * (max - min + 1));
  const elegir = (lista) => lista[Math.floor(azar() * lista.length)];
  const fechaHoy = hoy();
  const horaHoy = horaActual();

  // Limpieza en orden inverso a las dependencias.
  for (const t of ['auditoria', 'abonos', 'movimientos_inventario', 'detalle_venta', 'ventas', 'clientes', 'lotes', 'productos', 'proveedores', 'categorias', 'usuarios', 'roles']) {
    await knex(t).del();
  }

  await knex('roles').insert([
    { id: 1, nombre: 'admin', descripcion: 'Administrador: acceso total' },
    { id: 2, nombre: 'vendedor', descripcion: 'Vendedor: ventas, clientes y consulta de inventario' },
  ]);
  await knex('usuarios').insert([
    { id: 1, nombre: 'Bryan Quintero', usuario: 'admin', correo: 'admin@salsamentariamyk.com', hash_contrasena: await bcrypt.hash('admin123', 10), rol_id: 1, activo: true },
    { id: 2, nombre: 'Laura Méndez', usuario: 'vendedor', correo: 'ventas@salsamentariamyk.com', hash_contrasena: await bcrypt.hash('vendedor123', 10), rol_id: 2, activo: true },
  ]);
  await knex('categorias').insert([
    { id: 1, nombre: 'Cárnicos', icono: '🥩' },
    { id: 2, nombre: 'Lácteos', icono: '🧀' },
    { id: 3, nombre: 'Otros', icono: '📦' },
  ]);
  await knex('proveedores').insert([
    { id: 1, nit: '900123456-1', razon_social: 'Cárnicos del Huila S.A.', contacto: 'Andrés Polanía', telefono: '6088723456', correo: 'pedidos@carnicoshuila.com', direccion: 'Zona Industrial, Neiva', activo: true },
    { id: 2, nit: '901234567-8', razon_social: 'Lácteos San Isidro', contacto: 'Diana Vargas', telefono: '3185551234', correo: 'ventas@lacteossanisidro.com', direccion: 'Vereda San Isidro, Rivera', activo: true },
    { id: 3, nit: '800456789-3', razon_social: 'Distribuidora El Trapiche', contacto: 'Hernán Cuéllar', telefono: '3164447788', correo: 'contacto@eltrapiche.co', direccion: 'Cra. 7 # 12-40, Neiva', activo: true },
  ]);

  // ── Simulación de ventas (90 días) ──────────────────────────────
  const prods = PRODUCTOS.map((p, i) => ({
    id: i + 1, codigo: p[0], nombre: p[1], categoria_id: p[2], presentacion: p[3], unidad: p[4], precio_compra: p[5],
    precio_venta: p[6], stock_minimo: p[7], proveedor_id: p[8], objetivo: p[9], diasVence: p[10], descripcion: p[11],
    margen: Math.round(((p[6] / p[5]) - 1) * 1000) / 10,
  }));
  const MEDIOS = [['efectivo', 55], ['transferencia', 25], ['tarjeta', 12], ['credito', 8]];
  const medio = () => { let r = azar() * 100; for (const [m, w] of MEDIOS) { if ((r -= w) < 0) return m; } return 'efectivo'; };

  const ventas = []; const detalles = []; const abonos = [];
  for (let d = 89; d >= 0; d -= 1) {
    const fecha = sumarDias(fechaHoy, -d);
    const dow = new Date(`${fecha}T12:00:00Z`).getUTCDay();
    const n = entre(3, 6) + (dow === 5 || dow === 6 ? 2 : 0) + (d < 30 ? 1 : 0);
    const horas = Array.from({ length: n }, () => `${String(entre(8, 19)).padStart(2, '0')}:${String(entre(0, 59)).padStart(2, '0')}`).sort();
    for (const hora of horas) {
      if (d === 0 && hora > horaHoy) continue;
      let clienteId = azar() < 0.4 ? null : entre(1, CLIENTES.length);
      let mp = medio();
      if (mp === 'credito' && !clienteId) clienteId = elegir([1, 4, 7]);
      const ventaId = ventas.length + 1;
      const lineas = entre(1, clienteId === 4 || clienteId === 7 ? 4 : 3);
      const usados = new Set(); let total = 0;
      for (let k = 0; k < lineas; k += 1) {
        const p = elegir(prods);
        if (usados.has(p.id)) continue;
        usados.add(p.id);
        const cantidad = entre(1, clienteId === 4 || clienteId === 7 ? 6 : 3);
        total += cantidad * p.precio_venta;
        detalles.push({ venta_id: ventaId, producto_id: p.id, cantidad, precio_unitario: p.precio_venta, subtotal: cantidad * p.precio_venta, fecha });
      }
      const anulada = azar() < 0.02;
      let estado = anulada ? 'anulada' : 'pagada';
      let saldo = 0;
      if (!anulada && mp === 'credito') {
        if (d > 8) {
          const parcial = Math.round((total * 0.5) / 100) * 100;
          abonos.push({ venta_id: ventaId, usuario_id: 1, valor: parcial, medio_pago: 'efectivo', fecha: sumarDias(fecha, 3) });
          abonos.push({ venta_id: ventaId, usuario_id: 1, valor: total - parcial, medio_pago: 'transferencia', fecha: sumarDias(fecha, 7) });
        } else {
          estado = 'pendiente';
          saldo = total;
          if (azar() < 0.5) {
            const parcial = Math.round((total * 0.3) / 100) * 100;
            abonos.push({ venta_id: ventaId, usuario_id: 2, valor: parcial, medio_pago: 'efectivo', fecha });
            saldo = total - parcial;
          }
        }
      }
      ventas.push({
        id: ventaId, consecutivo: `V-${String(ventaId).padStart(4, '0')}`, cliente_id: clienteId, usuario_id: azar() < 0.6 ? 2 : 1,
        fecha, hora, medio_pago: mp, estado, total, saldo,
        motivo_anulacion: anulada ? 'Error en el registro de la venta' : null, anulada_por: anulada ? 1 : null,
      });
    }
  }

  // ── Lotes: A (histórico, ya agotado), B (actual, FEFO), C (reciente) y uno vencido ──
  const lotes = []; const movimientos = [];
  const vigente = new Set(ventas.filter((v) => v.estado !== 'anulada').map((v) => v.id));
  const fechaVenta = new Map(ventas.map((v) => [v.id, v.fecha]));
  const corte = sumarDias(fechaHoy, -30);

  for (const p of prods) {
    const lineas = detalles.filter((x) => x.producto_id === p.id);
    const vendidoA = lineas.filter((x) => x.fecha < corte && vigente.has(x.venta_id)).reduce((s, x) => s + x.cantidad, 0);
    const vendidoB = lineas.filter((x) => x.fecha >= corte && vigente.has(x.venta_id)).reduce((s, x) => s + x.cantidad, 0);
    const restoC = p.objetivo >= 10 ? Math.floor(p.objetivo * 0.6) : 0;
    const restoB = p.objetivo - restoC;
    const base = { producto_id: p.id, proveedor_id: p.proveedor_id, costo_unitario: p.precio_compra, usuario_id: 1 };
    const A = { ...base, id: lotes.length + 1, codigo_lote: `${p.codigo}-A`, cantidad_inicial: vendidoA + 4, cantidad_disponible: 0, fecha_ingreso: sumarDias(fechaHoy, -92), fecha_vencimiento: sumarDias(fechaHoy, -29) };
    lotes.push(A);
    const B = { ...base, id: lotes.length + 1, codigo_lote: `${p.codigo}-B`, cantidad_inicial: vendidoB + restoB, cantidad_disponible: restoB, fecha_ingreso: sumarDias(fechaHoy, -31), fecha_vencimiento: sumarDias(fechaHoy, p.diasVence) };
    lotes.push(B);
    if (restoC) lotes.push({ ...base, id: lotes.length + 1, codigo_lote: `${p.codigo}-C`, cantidad_inicial: restoC, cantidad_disponible: restoC, fecha_ingreso: sumarDias(fechaHoy, -4), fecha_vencimiento: sumarDias(fechaHoy, p.diasVence + 21) });
    p.loteA = A.id; p.loteB = B.id;
  }
  // Lote vencido con existencias (genera alerta y debe darse de baja).
  const yogurt = prods.find((p) => p.codigo === 'LCT-005');
  lotes.push({ id: lotes.length + 1, producto_id: yogurt.id, proveedor_id: 2, codigo_lote: 'LCT-005-X', cantidad_inicial: 6, cantidad_disponible: 3, costo_unitario: yogurt.precio_compra, fecha_ingreso: sumarDias(fechaHoy, -16), fecha_vencimiento: sumarDias(fechaHoy, -2), usuario_id: 1 });

  for (const l of lotes) {
    movimientos.push({ lote_id: l.id, producto_id: l.producto_id, usuario_id: 1, tipo: 'entrada', cantidad: l.cantidad_inicial, motivo: 'Entrada de mercancía', fecha: l.fecha_ingreso });
  }
  // Merma de los 4 sobrantes del lote A (vencieron) y 3 del lote vencido de yogurt.
  for (const p of prods) movimientos.push({ lote_id: p.loteA, producto_id: p.id, usuario_id: 1, tipo: 'ajuste', cantidad: -4, motivo: 'vencimiento: baja de lote vencido', fecha: sumarDias(fechaHoy, -28) });
  movimientos.push({ lote_id: lotes.length, producto_id: yogurt.id, usuario_id: 1, tipo: 'ajuste', cantidad: -3, motivo: 'averia: envase roto', fecha: sumarDias(fechaHoy, -10) });

  for (const x of detalles) {
    const p = prods[x.producto_id - 1];
    const lote = x.fecha < corte ? p.loteA : p.loteB;
    const fecha = fechaVenta.get(x.venta_id);
    movimientos.push({ lote_id: lote, producto_id: p.id, usuario_id: 1, tipo: 'venta', cantidad: -x.cantidad, venta_id: x.venta_id, fecha });
    if (!vigente.has(x.venta_id)) {
      movimientos.push({ lote_id: lote, producto_id: p.id, usuario_id: 1, tipo: 'anulacion', cantidad: x.cantidad, motivo: 'Error en el registro de la venta', venta_id: x.venta_id, fecha });
    }
  }

  // ── Inserción ───────────────────────────────────────────────────
  const stock = new Map();
  for (const l of lotes) stock.set(l.producto_id, (stock.get(l.producto_id) || 0) + l.cantidad_disponible);
  await knex('productos').insert(prods.map((p) => ({
    id: p.id, codigo: p.codigo, nombre: p.nombre, categoria_id: p.categoria_id, proveedor_id: p.proveedor_id, presentacion: p.presentacion,
    unidad: p.unidad, precio_compra: p.precio_compra, margen: p.margen, precio_venta: p.precio_venta, stock: stock.get(p.id) || 0,
    stock_minimo: p.stock_minimo, descripcion: p.descripcion, activo: true,
  })));
  await knex('clientes').insert(CLIENTES.map(([documento, nombre, telefono], i) => ({
    id: i + 1, documento, nombre, telefono, autoriza_datos: true, activo: true,
  })));
  await knex.batchInsert('lotes', lotes, 200);
  await knex.batchInsert('ventas', ventas, 200);
  await knex.batchInsert('detalle_venta', detalles.map(({ fecha, ...d }) => d), 200);
  await knex.batchInsert('movimientos_inventario', movimientos, 200);
  await knex.batchInsert('abonos', abonos, 200);
  await knex('auditoria').insert({ usuario_id: 1, accion: 'SEMILLA', entidad: 'sistema', detalle: JSON.stringify({ ventas: ventas.length, lotes: lotes.length }) });

  // PostgreSQL: sincronizar las secuencias después de insertar ids explícitos.
  if (['pg', 'postgres', 'postgresql'].includes(knex.client.config.client)) {
    for (const t of ['roles', 'usuarios', 'categorias', 'proveedores', 'productos', 'lotes', 'clientes', 'ventas', 'detalle_venta', 'movimientos_inventario', 'abonos', 'auditoria']) {
      await knex.raw(`select setval(pg_get_serial_sequence('${t}', 'id'), coalesce((select max(id) from ${t}), 1))`);
    }
  }
};
