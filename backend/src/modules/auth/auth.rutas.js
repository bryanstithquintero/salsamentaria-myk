const { Router } = require('express');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const env = require('../../config/env');
const validar = require('../../middlewares/validar');
const { autenticar } = require('../../middlewares/auth');
const servicio = require('./auth.servicio');

const router = Router();

const esquemaLogin = z.object({
  usuario: z.string({ error: 'El usuario es obligatorio' }).trim().min(3, 'Mínimo 3 caracteres').max(120),
  contrasena: z.string({ error: 'La contraseña es obligatoria' }).min(6, 'Mínimo 6 caracteres').max(100),
});

const esquemaContrasena = z.object({
  actual: z.string().min(6),
  nueva: z.string().min(8, 'La nueva contraseña debe tener mínimo 8 caracteres').max(100),
});

// Limita intentos de inicio de sesión para mitigar ataques de fuerza bruta.
const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 1000 : 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { codigo: 'DEMASIADOS_INTENTOS', mensaje: 'Demasiados intentos. Espere 15 minutos.' } },
});

router.post('/login', limiteLogin, validar(esquemaLogin), async (req, res) => {
  res.json(await servicio.login(req.body));
});

router.get('/perfil', autenticar, (req, res) => {
  res.json(req.usuario);
});

router.put('/contrasena', autenticar, validar(esquemaContrasena), async (req, res) => {
  await servicio.cambiarContrasena(req.usuario.id, req.body);
  res.status(204).end();
});

module.exports = router;
