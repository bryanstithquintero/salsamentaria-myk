const { Router } = require('express');
const { z } = require('zod');
const validar = require('../../middlewares/validar');
const { autorizar } = require('../../middlewares/auth');
const { leerPaginacion, respuestaPaginada } = require('../../utils/paginacion');
const { aCsv } = require('../../utils/csv');
const servicio = require('./productos.servicio');

const router = Router();

const entero = (msg) => z.coerce.number({ error: msg }).int(msg);
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha con formato AAAA-MM-DD');

const campos = {
  codigo: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,20}$/, 'Código de 3 a 20 caracteres (letras, números y guion)'),
  nombre: z.string().trim().min(3, 'Mínimo 3 caracteres').max(120),
  categoria_id: entero('Seleccione una categoría').positive('Seleccione una categoría'),
  proveedor_id: entero('Proveedor no válido').positive().nullable().optional(),
  presentacion: z.string().trim().min(1, 'La presentación es obligatoria').max(60),
  unidad: z.enum(['unidad', 'paquete', 'libra', 'kilo', 'botella', 'bolsa'], { error: 'Unidad no válida' }).default('unidad'),
  precio_compra: entero('Precio de compra no válido').positive('Debe ser mayor que cero'),
  margen: z.coerce.number().min(0, 'No puede ser negativo').max(500, 'Máximo 500 %').default(30),
  precio_venta: entero('Precio de venta no válido').positive().optional(),
  stock_minimo: entero('Stock mínimo no válido').min(0, 'No puede ser negativo').default(5),
  descripcion: z.string().trim().max(500).optional().nullable(),
};

const esquemaCrear = z.object({
  ...campos,
  stock_inicial: entero('Cantidad no válida').min(0).max(100000).default(0),
  fecha_vencimiento: fecha.optional().nullable(),
});
const esquemaEditar = z.object({ ...campos, activo: z.boolean().optional() }).partial();
const esquemaId = z.object({ id: z.coerce.number().int().positive() });
const esquemaListado = z.object({
  buscar: z.string().trim().max(60).optional(),
  categoria_id: z.coerce.number().int().positive().optional(),
  estado: z.enum(['bajo', 'ok']).optional(),
  activo: z.enum(['true', 'false', 'todos']).optional(),
  orden: z.enum(['nombre', 'codigo', 'stock', 'precio', 'categoria']).optional(),
  dir: z.enum(['asc', 'desc']).optional(),
  pagina: z.coerce.number().int().positive().optional(),
  limite: z.coerce.number().int().positive().max(100).optional(),
});
const esquemaImportar = z.object({
  productos: z.array(z.object({ ...esquemaCrear.shape, categoria_id: z.any().optional(), categoria: z.string().min(1) }))
    .min(1, 'El archivo no tiene filas').max(500, 'Máximo 500 filas por archivo'),
});

router.get('/', validar(esquemaListado, 'query'), async (req, res) => {
  const pag = leerPaginacion(req.validQuery);
  const { filas, total, porCategoria } = await servicio.listar(req.validQuery, pag);
  const r = respuestaPaginada(filas, total, pag);
  r.meta.porCategoria = porCategoria;
  res.json(r);
});

router.get('/exportar', validar(esquemaListado, 'query'), async (req, res) => {
  const { filas } = await servicio.listar(req.validQuery, { limite: 10000, offset: 0 });
  const csv = aCsv([
    { titulo: 'Código', valor: 'codigo' }, { titulo: 'Producto', valor: 'nombre' }, { titulo: 'Categoría', valor: 'categoria' },
    { titulo: 'Presentación', valor: 'presentacion' }, { titulo: 'Unidad', valor: 'unidad' }, { titulo: 'Existencias', valor: 'stock' },
    { titulo: 'Stock mínimo', valor: 'stock_minimo' }, { titulo: 'Precio compra', valor: 'precio_compra' },
    { titulo: 'Margen %', valor: 'margen' }, { titulo: 'Precio venta', valor: 'precio_venta' },
    { titulo: 'Próximo vencimiento', valor: 'proximo_vencimiento' }, { titulo: 'Proveedor', valor: 'proveedor' },
    { titulo: 'Estado', valor: (p) => (p.bajo_stock ? 'Bajo stock' : 'Disponible') },
  ], filas);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="inventario-myk.csv"');
  res.send(csv);
});

router.get('/:id', validar(esquemaId, 'params'), async (req, res) => {
  res.json(await servicio.obtener(req.params.id));
});

router.post('/', autorizar('admin'), validar(esquemaCrear), async (req, res) => {
  res.status(201).json(await servicio.crear(req.body, req.usuario, req.ip));
});

router.post('/importar', autorizar('admin'), validar(esquemaImportar), async (req, res) => {
  const resultado = await servicio.importar(req.body.productos, req.usuario, req.ip);
  res.status(resultado.creados > 0 ? 201 : 200).json(resultado);
});

router.put('/:id', autorizar('admin'), validar(esquemaId, 'params'), validar(esquemaEditar), async (req, res) => {
  res.json(await servicio.actualizar(req.params.id, req.body, req.usuario, req.ip));
});

router.delete('/:id', autorizar('admin'), validar(esquemaId, 'params'), async (req, res) => {
  await servicio.desactivar(req.params.id, req.usuario, req.ip);
  res.status(204).end();
});

module.exports = router;
