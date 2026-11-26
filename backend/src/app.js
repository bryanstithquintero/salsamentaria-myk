/**
 * Configuración de la aplicación Express (API REST de MYK).
 * Se separa de server.js para poder probarla con Supertest sin abrir un puerto.
 */
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const yaml = require('js-yaml');
const swaggerUi = require('swagger-ui-express');

const env = require('./config/env');
const db = require('./db/knex');
const { autenticar } = require('./middlewares/auth');
const { noEncontrado, manejadorErrores } = require('./middlewares/errores');

const app = express();
const openapi = yaml.load(fs.readFileSync(path.join(__dirname, 'docs/openapi.yaml'), 'utf8'));

app.set('trust proxy', 1); // Render y otros PaaS usan un proxy inverso
app.disable('x-powered-by');

app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});
app.use(helmet());
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || env.CORS_ORIGIN.includes(origin)),
  exposedHeaders: ['Content-Disposition', 'X-Request-Id'],
}));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));

// ── Documentación interactiva (Swagger UI) ────────────────────
app.get('/api/docs.json', (_req, res) => res.json(openapi));
app.use('/api/docs', helmet({ contentSecurityPolicy: false }), swaggerUi.serve, swaggerUi.setup(openapi, {
  customSiteTitle: 'API MYK – Swagger',
  swaggerOptions: { persistAuthorization: true },
}));

// ── Rutas públicas ────────────────────────────────────────────
app.get('/', (_req, res) => res.json({ api: 'MYK – Control de Ventas e Inventario', version: '1.0.0', documentacion: '/api/docs' }));
app.get('/api/health', async (_req, res) => {
  await db.raw('select 1');
  res.json({ estado: 'ok', baseDeDatos: 'conectada', hora: new Date().toISOString() });
});
app.use('/api/auth', require('./modules/auth/auth.rutas'));

// ── Rutas protegidas (requieren token JWT) ───────────────────
const catalogo = require('./modules/catalogo/catalogo.rutas');
app.use('/api', autenticar);
app.use('/api/usuarios', require('./modules/usuarios/usuarios.rutas'));
app.use('/api/categorias', catalogo.categorias);
app.use('/api/proveedores', catalogo.proveedores);
app.use('/api/productos', require('./modules/productos/productos.rutas'));
app.use('/api/inventario', require('./modules/inventario/inventario.rutas'));
app.use('/api/ventas', require('./modules/ventas/ventas.rutas'));
app.use('/api/clientes', require('./modules/clientes/clientes.rutas'));
app.use('/api/dashboard', require('./modules/dashboard/dashboard.rutas'));
app.use('/api/reportes', require('./modules/reportes/reportes.rutas'));
app.use('/api/auditoria', require('./modules/auditoria/auditoria.rutas'));

// ── Errores ───────────────────────────────────────────────────
app.use(noEncontrado);
app.use(manejadorErrores);

module.exports = app;
