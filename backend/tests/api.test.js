/**
 * Pruebas de integración de la API (node:test + Supertest).
 * Se ejecutan sobre SQLite en memoria: cada corrida parte de los datos de demostración.
 */
process.env.NODE_ENV = 'test';

const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const request = require('supertest');
const SwaggerParser = require('@apidevtools/swagger-parser');

const db = require('../src/db/knex');
const app = require('../src/app');
const { hoy, sumarDias } = require('../src/utils/fechas');

let admin;
let vendedor;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

async function login(usuario, contrasena) {
  const r = await request(app).post('/api/auth/login').send({ usuario, contrasena });
  return r.body.token;
}

async function crearProducto(datos = {}) {
  const r = await request(app).post('/api/productos').set(auth(admin)).send({
    codigo: `TST-${Math.floor(Math.random() * 1e6)}`, nombre: 'Producto de prueba', categoria_id: 1,
    presentacion: 'Unidad', precio_compra: 1000, margen: 50, stock_minimo: 2, ...datos,
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body;
}

async function entrada(productoId, cantidad, diasVence) {
  const r = await request(app).post('/api/inventario/entradas').set(auth(admin))
    .send({ producto_id: productoId, cantidad, fecha_vencimiento: sumarDias(hoy(), diasVence) });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body;
}

before(async () => {
  await db.migrate.latest();
  await db.seed.run();
  admin = await login('admin', 'admin123');
  vendedor = await login('vendedor', 'vendedor123');
});

after(async () => {
  await db.destroy();
});

describe('Sistema y documentación', () => {
  test('GET /api/health responde ok', async () => {
    const r = await request(app).get('/api/health');
    assert.equal(r.status, 200);
    assert.equal(r.body.estado, 'ok');
  });

  test('la especificación OpenAPI (Swagger) es válida', async () => {
    const api = await SwaggerParser.validate(path.join(__dirname, '../src/docs/openapi.yaml'));
    assert.ok(api.paths['/api/ventas']);
  });

  test('ruta inexistente devuelve 404 con formato de error uniforme', async () => {
    const r = await request(app).get('/api/no-existe').set(auth(admin));
    assert.equal(r.status, 404);
    assert.equal(r.body.error.codigo, 'RUTA_NO_ENCONTRADA');
    assert.ok(r.body.error.solicitud);
  });

  test('JSON mal formado devuelve 400', async () => {
    const r = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"usuario":');
    assert.equal(r.status, 400);
    assert.equal(r.body.error.codigo, 'SOLICITUD_INVALIDA');
  });
});

describe('Autenticación y autorización', () => {
  test('credenciales incorrectas → 401', async () => {
    const r = await request(app).post('/api/auth/login').send({ usuario: 'admin', contrasena: 'equivocada' });
    assert.equal(r.status, 401);
    assert.equal(r.body.error.codigo, 'CREDENCIALES_INVALIDAS');
  });

  test('datos de login inválidos → 400 con detalle por campo', async () => {
    const r = await request(app).post('/api/auth/login').send({ usuario: 'a' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.codigo, 'VALIDACION');
    assert.ok(r.body.error.detalles.some((d) => d.campo === 'contrasena'));
  });

  test('sin token → 401; token alterado → 401', async () => {
    assert.equal((await request(app).get('/api/productos')).status, 401);
    const r = await request(app).get('/api/productos').set(auth(`${admin}x`));
    assert.equal(r.status, 401);
    assert.equal(r.body.error.codigo, 'TOKEN_INVALIDO');
  });

  test('el vendedor no puede crear productos ni ver reportes → 403', async () => {
    const r = await request(app).post('/api/productos').set(auth(vendedor)).send({});
    assert.equal(r.status, 403);
    assert.equal((await request(app).get('/api/reportes/ventas').set(auth(vendedor))).status, 403);
  });
});

describe('Productos', () => {
  test('calcula el precio de venta con el margen y lo redondea a la centena', async () => {
    const p = await crearProducto({ precio_compra: 4500, margen: 35 });
    assert.equal(p.precio_venta, 6100);
  });

  test('valida campos obligatorios', async () => {
    const r = await request(app).post('/api/productos').set(auth(admin)).send({ codigo: 'X', precio_compra: -5 });
    assert.equal(r.status, 400);
    const campos = r.body.error.detalles.map((d) => d.campo);
    for (const c of ['codigo', 'nombre', 'categoria_id', 'precio_compra']) assert.ok(campos.includes(c), c);
  });

  test('rechaza código duplicado → 409', async () => {
    const r = await request(app).post('/api/productos').set(auth(admin)).send({
      codigo: 'CHO-001', nombre: 'Duplicado', categoria_id: 1, presentacion: 'x', precio_compra: 100,
    });
    assert.equal(r.status, 409);
  });

  test('lista con búsqueda, filtro de bajo stock y paginación', async () => {
    const r = await request(app).get('/api/productos?estado=bajo&limite=2').set(auth(vendedor));
    assert.equal(r.status, 200);
    assert.ok(r.body.datos.length <= 2);
    assert.ok(r.body.datos.every((p) => p.bajo_stock));
    assert.ok(r.body.meta.total >= r.body.datos.length);
  });
});

describe('Ventas e inventario FEFO', () => {
  test('descuenta primero del lote que vence antes (FEFO)', async () => {
    const p = await crearProducto();
    const lejano = await entrada(p.id, 5, 10);
    const cercano = await entrada(p.id, 5, 3);
    const r = await request(app).post('/api/ventas').set(auth(vendedor))
      .send({ medio_pago: 'efectivo', items: [{ producto_id: p.id, cantidad: 4 }, { producto_id: p.id, cantidad: 3 }] });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.total, 7 * p.precio_venta);
    assert.equal(r.body.items.length, 1, 'ítems repetidos se consolidan');

    const lotes = await db('lotes').whereIn('id', [lejano.id, cercano.id]);
    const disp = Object.fromEntries(lotes.map((l) => [l.id, l.cantidad_disponible]));
    assert.equal(disp[cercano.id], 0);
    assert.equal(disp[lejano.id], 3);
    assert.equal((await db('productos').where({ id: p.id }).first()).stock, 3);
  });

  test('stock insuficiente → 409 y no se modifica nada (transacción)', async () => {
    const p = await crearProducto();
    await entrada(p.id, 2, 5);
    const ventasAntes = (await db('ventas').count({ n: '*' }))[0].n;
    const r = await request(app).post('/api/ventas').set(auth(vendedor))
      .send({ medio_pago: 'efectivo', items: [{ producto_id: p.id, cantidad: 5 }] });
    assert.equal(r.status, 409);
    assert.equal(r.body.error.codigo, 'STOCK_INSUFICIENTE');
    assert.equal(r.body.error.detalles[0].disponible, 2);
    assert.equal((await db('productos').where({ id: p.id }).first()).stock, 2);
    assert.equal((await db('ventas').count({ n: '*' }))[0].n, ventasAntes);
  });

  test('no vende unidades de lotes vencidos', async () => {
    const p = await crearProducto();
    await db('lotes').insert({ producto_id: p.id, cantidad_inicial: 4, cantidad_disponible: 4, costo_unitario: 1000, fecha_ingreso: sumarDias(hoy(), -10), fecha_vencimiento: sumarDias(hoy(), -1) });
    await db('productos').where({ id: p.id }).update({ stock: 4 });
    const r = await request(app).post('/api/ventas').set(auth(vendedor))
      .send({ medio_pago: 'efectivo', items: [{ producto_id: p.id, cantidad: 1 }] });
    assert.equal(r.status, 409);
    const alertas = await request(app).get('/api/inventario/alertas').set(auth(admin));
    assert.ok(alertas.body.vencidos.some((l) => l.producto_id === p.id));
  });

  test('anular reintegra el inventario al mismo lote; anular dos veces → 409', async () => {
    const p = await crearProducto();
    const lote = await entrada(p.id, 6, 8);
    const v = (await request(app).post('/api/ventas').set(auth(vendedor))
      .send({ medio_pago: 'tarjeta', items: [{ producto_id: p.id, cantidad: 4 }] })).body;
    assert.equal((await request(app).patch(`/api/ventas/${v.id}/anular`).set(auth(vendedor)).send({ motivo: 'Prueba de permisos' })).status, 403);
    const r = await request(app).patch(`/api/ventas/${v.id}/anular`).set(auth(admin)).send({ motivo: 'Cliente desistió de la compra' });
    assert.equal(r.status, 200);
    assert.equal(r.body.estado, 'anulada');
    assert.equal((await db('lotes').where({ id: lote.id }).first()).cantidad_disponible, 6);
    assert.equal((await db('productos').where({ id: p.id }).first()).stock, 6);
    const otra = await request(app).patch(`/api/ventas/${v.id}/anular`).set(auth(admin)).send({ motivo: 'Segunda vez' });
    assert.equal(otra.status, 409);
    const audit = await db('auditoria').where({ entidad: 'venta', entidad_id: v.id, accion: 'ANULAR' }).first();
    assert.ok(audit, 'la anulación queda en la bitácora');
  });

  test('crédito: exige cliente, controla saldo y pasa a pagada al saldar', async () => {
    const p = await crearProducto({ precio_compra: 10000, margen: 0 });
    await entrada(p.id, 10, 15);
    const sinCliente = await request(app).post('/api/ventas').set(auth(vendedor))
      .send({ medio_pago: 'credito', items: [{ producto_id: p.id, cantidad: 1 }] });
    assert.equal(sinCliente.status, 422);

    const v = (await request(app).post('/api/ventas').set(auth(vendedor))
      .send({ cliente_id: 1, medio_pago: 'credito', abono_inicial: 5000, items: [{ producto_id: p.id, cantidad: 2 }] })).body;
    assert.equal(v.estado, 'pendiente');
    assert.equal(v.saldo, 15000);

    const excede = await request(app).post(`/api/ventas/${v.id}/abonos`).set(auth(vendedor)).send({ valor: 20000 });
    assert.equal(excede.status, 422);
    const parcial = await request(app).post(`/api/ventas/${v.id}/abonos`).set(auth(vendedor)).send({ valor: 10000 });
    assert.equal(parcial.body.saldo, 5000);
    const final = await request(app).post(`/api/ventas/${v.id}/abonos`).set(auth(vendedor)).send({ valor: 5000, medio_pago: 'transferencia' });
    assert.equal(final.body.estado, 'pagada');
    assert.equal(final.body.abonos.length, 3);
  });
});

describe('Panel y reportes', () => {
  test('resumen del panel con indicadores', async () => {
    const r = await request(app).get('/api/dashboard/resumen').set(auth(vendedor));
    assert.equal(r.status, 200);
    assert.ok(r.body.inventario.referencias > 0);
    assert.ok(Array.isArray(r.body.ventas_recientes));
  });

  test('serie de 7 días con una etiqueta por día', async () => {
    const r = await request(app).get('/api/dashboard/ventas?periodo=7d').set(auth(admin));
    assert.equal(r.body.etiquetas.length, 7);
    assert.equal(r.body.etiquetas[6], 'Hoy');
  });

  test('reporte CSV de ventas', async () => {
    const r = await request(app).get('/api/reportes/ventas?formato=csv').set(auth(admin));
    assert.equal(r.status, 200);
    assert.match(r.headers['content-type'], /text\/csv/);
    assert.match(r.text, /Venta;Fecha;Hora/);
  });

  test('rango de fechas invertido → 400', async () => {
    const r = await request(app).get('/api/reportes/ventas?desde=2026-11-20&hasta=2026-11-01').set(auth(admin));
    assert.equal(r.status, 400);
  });
});
