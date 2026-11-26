# MYK – API REST (backend)

API de **MYK – Control de Ventas e Inventario** para la Salsamentaria MYK (Neiva, Huila).
Construida con **Node.js + Express 5**, **Knex** (SQLite en desarrollo, PostgreSQL en producción),
autenticación **JWT** con roles y documentación interactiva **Swagger (OpenAPI 3)**.

## Ejecutar en local (VS Code)

```bash
cd backend
npm install
cp .env.example .env      # en Windows: copy .env.example .env
npm run dev               # http://localhost:4000
```

La primera vez se crea la base SQLite (`data/myk.sqlite3`), se aplican las migraciones y se cargan
datos de demostración (90 días de ventas). No hace falta instalar ningún motor de base de datos.

- Documentación Swagger: <http://localhost:4000/api/docs>
- Usuarios de prueba: `admin` / `admin123` (administrador) y `vendedor` / `vendedor123` (vendedor)

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor con recarga automática |
| `npm start` | Servidor en modo normal |
| `npm test` | Pruebas de integración (node:test + Supertest, SQLite en memoria) |
| `npm run db:reset` | Borra y vuelve a crear la base con los datos de demostración |

## Arquitectura

```
src/
├── app.js                 # Express: seguridad, CORS, rutas, Swagger y manejo de errores
├── server.js              # Arranque: migraciones, datos iniciales y puerto
├── config/env.js          # Variables de entorno
├── db/                    # Knex, migraciones y semillas
├── docs/openapi.yaml      # Contrato de la API (Swagger)
├── middlewares/           # auth (JWT + roles), validar (Zod), errores (respuesta uniforme)
├── utils/                 # AppError, fechas (America/Bogota), paginación, CSV, auditoría
└── modules/               # auth, usuarios, catalogo, productos, inventario, ventas,
                           # clientes, dashboard, reportes, auditoria
```

Cada módulo separa **rutas** (HTTP + validación) y **servicio** (reglas de negocio y acceso a datos).

## Reglas de negocio implementadas

- **Inventario por lotes con FEFO**: cada venta descuenta primero del lote que vence antes; los lotes vencidos no se venden.
- **Transacciones**: una venta, anulación, abono o ajuste se aplica completa o no se aplica (`db.transaction`).
- **Precio de venta** = precio de compra × (1 + margen), redondeado a la centena (si no se envía).
- **Crédito (fiado)**: exige cliente; los abonos reducen el saldo y la venta pasa a *pagada* al llegar a cero.
- **Anulación** (solo administrador): reintegra cada unidad al mismo lote del que salió.
- **Borrado lógico** de productos y clientes; **auditoría** de operaciones críticas.

## Manejo de errores

Todas las respuestas de error tienen el mismo formato:

```json
{ "error": { "codigo": "STOCK_INSUFICIENTE", "mensaje": "No hay existencias suficientes…",
             "detalles": [{ "producto": "Queso campesino", "solicitado": 6, "disponible": 4 }],
             "solicitud": "3f1c2b7e-…" } }
```

| Código HTTP | Cuándo |
|---|---|
| 400 | Datos inválidos (validación Zod con detalle por campo) o JSON mal formado |
| 401 | Sin token, token inválido o expirado, credenciales incorrectas |
| 403 | El rol no tiene permiso |
| 404 | Recurso o ruta inexistente |
| 409 | Duplicados, stock insuficiente, venta ya anulada |
| 422 | Regla de negocio incumplida (crédito sin cliente, abono mayor al saldo…) |
| 500 | Error inesperado (se registra con el id de solicitud, sin exponer detalles) |

## Variables de entorno (producción)

| Variable | Ejemplo |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Cadena de conexión de PostgreSQL (Neon) |
| `JWT_SECRET` | Cadena larga y aleatoria |
| `CORS_ORIGIN` | `https://bryanstithquintero.github.io` |
