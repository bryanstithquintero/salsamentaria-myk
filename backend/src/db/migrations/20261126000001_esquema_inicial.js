/**
 * Esquema inicial de MYK – Control de Ventas e Inventario.
 * Corresponde al modelo entidad-relación de la propuesta (Actividad 2):
 * roles, usuarios, categorías, proveedores, productos, lotes,
 * movimientos de inventario, clientes, ventas, detalle de venta, abonos y auditoría.
 */

exports.up = async function (knex) {
  await knex.schema.createTable('roles', (t) => {
    t.increments('id').primary();
    t.string('nombre', 30).notNullable().unique();
    t.string('descripcion', 120);
  });

  await knex.schema.createTable('usuarios', (t) => {
    t.increments('id').primary();
    t.string('nombre', 100).notNullable();
    t.string('usuario', 40).notNullable().unique();
    t.string('correo', 120).unique();
    t.string('hash_contrasena', 100).notNullable();
    t.integer('rol_id').unsigned().notNullable().references('id').inTable('roles');
    t.boolean('activo').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('categorias', (t) => {
    t.increments('id').primary();
    t.string('nombre', 60).notNullable().unique();
    t.string('icono', 8);
  });

  await knex.schema.createTable('proveedores', (t) => {
    t.increments('id').primary();
    t.string('nit', 20).notNullable().unique();
    t.string('razon_social', 120).notNullable();
    t.string('contacto', 100);
    t.string('telefono', 20);
    t.string('correo', 120);
    t.string('direccion', 160);
    t.boolean('activo').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('productos', (t) => {
    t.increments('id').primary();
    t.string('codigo', 20).notNullable().unique();
    t.string('nombre', 120).notNullable();
    t.integer('categoria_id').unsigned().notNullable().references('id').inTable('categorias');
    t.integer('proveedor_id').unsigned().references('id').inTable('proveedores');
    t.string('presentacion', 60).notNullable();
    t.string('unidad', 20).notNullable().defaultTo('unidad');
    t.integer('precio_compra').notNullable();
    t.decimal('margen', 6, 2).notNullable().defaultTo(0);
    t.integer('precio_venta').notNullable();
    t.integer('stock').notNullable().defaultTo(0); // suma de lotes disponibles (desnormalizado)
    t.integer('stock_minimo').notNullable().defaultTo(0);
    t.string('descripcion', 500);
    t.boolean('activo').notNullable().defaultTo(true);
    t.timestamps(true, true);
    t.index(['nombre']);
    t.index(['categoria_id']);
    t.check('?? >= 0', ['stock'], 'ck_productos_stock');
    t.check('?? > 0', ['precio_venta'], 'ck_productos_precio');
  });

  await knex.schema.createTable('lotes', (t) => {
    t.increments('id').primary();
    t.integer('producto_id').unsigned().notNullable().references('id').inTable('productos');
    t.integer('proveedor_id').unsigned().references('id').inTable('proveedores');
    t.string('codigo_lote', 40);
    t.integer('cantidad_inicial').notNullable();
    t.integer('cantidad_disponible').notNullable();
    t.integer('costo_unitario').notNullable();
    t.date('fecha_ingreso').notNullable();
    t.date('fecha_vencimiento');
    t.integer('usuario_id').unsigned().references('id').inTable('usuarios');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['producto_id', 'fecha_vencimiento']);
    t.check('?? >= 0', ['cantidad_disponible'], 'ck_lotes_disponible');
  });

  await knex.schema.createTable('clientes', (t) => {
    t.increments('id').primary();
    t.string('documento', 20).unique();
    t.string('nombre', 120).notNullable();
    t.string('telefono', 20);
    t.string('correo', 120);
    t.string('direccion', 160);
    t.boolean('autoriza_datos').notNullable().defaultTo(false);
    t.boolean('activo').notNullable().defaultTo(true);
    t.timestamps(true, true);
    t.index(['nombre']);
  });

  await knex.schema.createTable('ventas', (t) => {
    t.increments('id').primary();
    t.string('consecutivo', 12).notNullable().unique();
    t.integer('cliente_id').unsigned().references('id').inTable('clientes');
    t.integer('usuario_id').unsigned().notNullable().references('id').inTable('usuarios');
    t.date('fecha').notNullable();
    t.string('hora', 5).notNullable();
    t.string('medio_pago', 20).notNullable();
    t.string('estado', 12).notNullable();
    t.integer('total').notNullable();
    t.integer('saldo').notNullable().defaultTo(0);
    t.string('observacion', 300);
    t.string('motivo_anulacion', 300);
    t.integer('anulada_por').unsigned().references('id').inTable('usuarios');
    t.timestamp('anulada_en');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['fecha']);
    t.index(['estado']);
    t.index(['cliente_id']);
  });

  await knex.schema.createTable('detalle_venta', (t) => {
    t.increments('id').primary();
    t.integer('venta_id').unsigned().notNullable().references('id').inTable('ventas').onDelete('CASCADE');
    t.integer('producto_id').unsigned().notNullable().references('id').inTable('productos');
    t.integer('cantidad').notNullable();
    t.integer('precio_unitario').notNullable();
    t.integer('subtotal').notNullable();
    t.index(['venta_id']);
    t.index(['producto_id']);
  });

  await knex.schema.createTable('movimientos_inventario', (t) => {
    t.increments('id').primary();
    t.integer('lote_id').unsigned().notNullable().references('id').inTable('lotes');
    t.integer('producto_id').unsigned().notNullable().references('id').inTable('productos');
    t.integer('usuario_id').unsigned().references('id').inTable('usuarios');
    t.string('tipo', 12).notNullable(); // entrada | venta | ajuste | anulacion
    t.integer('cantidad').notNullable(); // positiva entra, negativa sale
    t.string('motivo', 200);
    t.integer('venta_id').unsigned().references('id').inTable('ventas');
    t.date('fecha').notNullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['producto_id']);
    t.index(['venta_id']);
  });

  await knex.schema.createTable('abonos', (t) => {
    t.increments('id').primary();
    t.integer('venta_id').unsigned().notNullable().references('id').inTable('ventas');
    t.integer('usuario_id').unsigned().notNullable().references('id').inTable('usuarios');
    t.integer('valor').notNullable();
    t.string('medio_pago', 20).notNullable();
    t.date('fecha').notNullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['venta_id']);
  });

  await knex.schema.createTable('auditoria', (t) => {
    t.increments('id').primary();
    t.integer('usuario_id').unsigned().references('id').inTable('usuarios');
    t.string('accion', 40).notNullable();
    t.string('entidad', 40).notNullable();
    t.integer('entidad_id');
    t.text('detalle');
    t.string('ip', 64);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['entidad', 'entidad_id']);
  });
};

exports.down = async function (knex) {
  for (const tabla of [
    'auditoria', 'abonos', 'movimientos_inventario', 'detalle_venta', 'ventas',
    'clientes', 'lotes', 'productos', 'proveedores', 'categorias', 'usuarios', 'roles',
  ]) {
    await knex.schema.dropTableIfExists(tabla);
  }
};
