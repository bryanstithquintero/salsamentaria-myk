# Guía de despliegue

La aplicación se publica en tres servicios gratuitos:

| Parte | Servicio | Qué se publica |
|---|---|---|
| Base de datos | **Neon** (PostgreSQL) | Datos del negocio |
| API (backend) | **Render** (Web Service) | `backend/` |
| Interfaz (frontend) | **GitHub Pages** | `frontend/` compilado |

## 1. Base de datos en Neon

1. Entrar a https://neon.com e iniciar sesión con GitHub.
2. Crear un proyecto llamado `myk` (región: la más cercana, por ejemplo *AWS US East*).
3. En **Connect**, copiar la cadena de conexión (empieza por `postgresql://` y termina en `?sslmode=require`).

## 2. API en Render

1. Entrar a https://render.com e iniciar sesión con GitHub.
2. **New → Blueprint** y elegir el repositorio `salsamentaria-myk` (Render lee `render.yaml`).
3. Cuando pida `DATABASE_URL`, pegar la cadena de Neon.
4. Esperar el despliegue. La API queda en `https://myk-api-8twu.onrender.com`.
   Al iniciar, la API crea las tablas y carga los datos de demostración automáticamente.
5. Verificar: `https://myk-api-8twu.onrender.com/api/health` debe responder `{"estado":"ok"}`.

> Si Render asigna otra URL (por ejemplo `myk-api-xxxx.onrender.com`), cámbiela en
> `frontend/src/api/cliente.js` y vuelva a publicar el frontend.

## 3. Interfaz en GitHub Pages

La versión compilada de React se guarda en la carpeta `docs/` del repositorio.

1. En el repositorio: **Settings → Pages → Build and deployment**.
2. **Source:** *Deploy from a branch* · **Branch:** `main` · **Folder:** `/docs` → **Save**.
3. La app queda en `https://bryanstithquintero.github.io/salsamentaria-myk/`
   y la versión 1 en `https://bryanstithquintero.github.io/salsamentaria-myk/v1/`.

## Actualizaciones

- **Backend:** cada *commit* en `backend/` que se sube a `main` hace que Render redespliegue la API.
- **Frontend:** después de cambiar el código, ejecutar en `frontend/`:

  ```bash
  npm run publicar   # ejecuta las pruebas, compila en ../docs y prepara GitHub Pages
  ```

  Luego hacer *commit* de `frontend/` y `docs/` y subirlo (*Sync Changes*). GitHub Pages publica en uno o dos minutos.
