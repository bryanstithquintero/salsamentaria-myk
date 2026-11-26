const { Router } = require('express');
const { z } = require('zod');
const validar = require('../../middlewares/validar');
const { autorizar } = require('../../middlewares/auth');
const { leerPaginacion, respuestaPaginada } = require('../../utils/paginacion');
const servicio = require('./ventas.servicio');

const router = Router();
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha con formato AAAA-MM-DD');
const idPositivo = z.coerce.number().int().positive();
const MEDIOS = ['efectivo', 'transferencia', 'tarjeta'];

const esquemaVenta = z.object({
  cliente_id: idPositivo.nullable().optional(),
  medio_pago: z.enum([...MEDIOS, 'credito'], { error: 'Medio de pago no válido' }),
  items: z.array(z.object({
    producto_id: idPositivo,
    cantidad: z.coerce.number().int('Cantidad entera').positive('La cantidad debe ser mayor que cero').max(1000),
  }), { error: 'Agregue al menos un producto' }).min(1, 'Agregue al menos un producto').max(50, 'Máximo 50 líneas por venta'),
  abono_inicial: z.coerce.number().int().min(0).optional(),
  medio_pago_abono: z.enum(MEDIOS).optional(),
  observacion: z.string().trim().max(300).optional().nullable(),
});

const esquemaListado = z.object({
  desde: fecha.optional(),
  hasta: fecha.optional(),
  estado: z.enum(['pagada', 'pendiente', 'anulada']).optional(),
  medio_pago: z.enum([...MEDIOS, 'credito']).optional(),
  cliente_id: idPositivo.optional(),
  buscar: z.string().trim().max(60).optional(),
  pagina: z.coerce.number().int().positive().optional(),
  limite: z.coerce.number().int().positive().max(100).optional(),
}).refine((f) => !f.desde || !f.hasta || f.desde <= f.hasta, { message: 'La fecha inicial debe ser anterior a la final', path: ['desde'] });

const esquemaId = z.object({ id: idPositivo });

router.get('/', validar(esquemaListado, 'query'), async (req, res) => {
  const pag = leerPaginacion(req.validQuery);
  const { filas, total, resumen } = await servicio.listar(req.validQuery, pag);
  const r = respuestaPaginada(filas, total, pag);
  r.meta.resumen = resumen;
  res.json(r);
});

router.get('/:id', validar(esquemaId, 'params'), async (req, res) => {
  res.json(await servicio.obtener(req.params.id));
});

router.post('/', validar(esquemaVenta), async (req, res) => {
  res.status(201).json(await servicio.crear(req.body, req.usuario, { ip: req.ip }));
});

router.patch('/:id/anular', autorizar('admin'), validar(esquemaId, 'params'),
  validar(z.object({ motivo: z.string().trim().min(5, 'Indique el motivo (mínimo 5 caracteres)').max(300) })),
  async (req, res) => {
    res.json(await servicio.anular(req.params.id, req.body.motivo, req.usuario, req.ip));
  });

router.post('/:id/abonos', validar(esquemaId, 'params'),
  validar(z.object({
    valor: z.coerce.number().int('Valor entero').positive('El abono debe ser mayor que cero'),
    medio_pago: z.enum(MEDIOS).default('efectivo'),
  })),
  async (req, res) => {
    res.status(201).json(await servicio.abonar(req.params.id, req.body, req.usuario, req.ip));
  });

module.exports = router;
