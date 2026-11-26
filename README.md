# Salsamentaria MYK — Control de Ventas e Inventario

Aplicación web para la **Salsamentaria MYK** (Neiva, Huila): registro de ventas de contado y a crédito,
inventario por lotes con fechas de vencimiento (FEFO), clientes, proveedores, reportes y auditoría.

Proyecto académico de Ingeniería de Software — Corporación Universitaria Iberoamericana.
Autor: **Bryan Stith Quintero Guacary**.

## Enlaces

| | URL |
|---|---|
| Aplicación (GitHub Pages) | https://bryanstithquintero.github.io/salsamentaria-myk/ |
| API REST (Render) | https://myk-api.onrender.com/api/health |
| Documentación Swagger | https://myk-api.onrender.com/api/docs |
| Versión 1 (HTML/CSS/JS) | https://bryanstithquintero.github.io/salsamentaria-myk/v1/ |

> El servidor gratuito de Render se suspende tras 15 minutos sin uso: la primera carga puede tardar cerca de un minuto.

**Usuarios de prueba:** `admin` / `admin123` (administrador) · `vendedor` / `vendedor123` (vendedor).

## Arquitectura

```
Navegador ──HTTPS/JSON──▶ API REST (Node.js + Express) ──SQL──▶ PostgreSQL
 React + Vite                JWT · roles · Zod · Swagger         (Neon)
 GitHub Pages                Render
```

```
salsamentaria-myk/
├── backend/     API REST (Express 5, Knex, JWT, Swagger, pruebas)
├── frontend/    Interfaz React (Vite, React Router, Context API, Axios)
├── legacy/      Versión 1 del sitio (HTML, CSS y JavaScript puro)
├── docs/        Sitio publicado en GitHub Pages (compilado con npm run publicar)
├── documentacion/  Documento de la actividad y guía de despliegue
└── render.yaml  Configuración de despliegue de la API (Render)
```

## Ejecutar todo en local

```bash
# Terminal 1 — API
cd backend && npm install && cp .env.example .env && npm run dev

# Terminal 2 — Interfaz
cd frontend && npm install && npm run dev
```

Abra http://localhost:5173. La documentación de la API queda en http://localhost:4000/api/docs.

## Pruebas

```bash
cd backend && npm test     # 21 pruebas de integración (node:test + Supertest)
cd frontend && npm test    # 13 pruebas (Vitest + Testing Library)
```

## Funcionalidades

- Inicio de sesión con JWT y dos roles (administrador y vendedor).
- Panel con indicadores del día, gráfica de ventas (7, 30 y 90 días) y alertas.
- Productos: búsqueda, filtros, precio calculado por margen, importación y exportación CSV.
- Inventario por lotes: entradas, ajustes, alertas de bajo stock y vencimiento, kardex.
- Punto de venta: carrito, cliente, contado o crédito con abono inicial y recibo imprimible.
- Historial de ventas con filtros, abonos y anulación con reintegro al lote.
- Clientes con historial y saldo; proveedores con sus entradas.
- Reportes por período (productos, medios de pago, categorías, vendedores) en CSV o PDF.
- Gestión de usuarios y bitácora de auditoría.

Guía de despliegue paso a paso: [documentacion/DESPLIEGUE.md](documentacion/DESPLIEGUE.md).
