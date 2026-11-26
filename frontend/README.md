# MYK – Interfaz web (frontend)

Aplicación de una sola página (SPA) construida con **React 19 + Vite**, que consume la API REST del backend.

## Ejecutar en local

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Requiere el backend corriendo en `http://localhost:4000` (ver `../backend/README.md`).
La URL de la API se define en `src/api/cliente.js` (se puede cambiar con `VITE_API_URL` en un archivo `.env.local`).

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga instantánea |
| `npm run build` | Compila la versión optimizada en `dist/` |
| `npm run preview` | Sirve la versión compilada |
| `npm test` | Pruebas con Vitest y Testing Library |
| `npm run publicar` | Pruebas + compilación en `../docs` para GitHub Pages |

## Cómo se aplican los conceptos

| Concepto | Dónde |
|---|---|
| **Componentes React** | `src/components/` (Layout, Modal, Paginación, Gráfica…) y `src/pages/` |
| **useState / useEffect** | `src/hooks/useApi.js` (carga de datos con cancelación) y formularios |
| **useContext + Context API** | `src/context/AuthContext.jsx` (sesión) y `ToastContext.jsx` (notificaciones) |
| **useReducer** | `src/utils/carrito.js` + `src/pages/NuevaVenta.jsx` (carrito del punto de venta) |
| **Axios** | `src/api/cliente.js` (instancia, interceptores de token y errores) y `src/api/servicios.js` |
| **Rutas y navegación** | `src/router.jsx` (React Router, rutas protegidas por sesión y rol, carga diferida) |
| **Despliegue** | `npm run publicar` → carpeta `docs/` publicada por GitHub Pages |

## Rendimiento

- Cada pantalla se descarga solo cuando se visita (`lazy` en las rutas).
- Chart.js se carga únicamente en las pantallas con gráficas.
- Búsquedas con *debounce* y paginación en el servidor.
- Peticiones canceladas con `AbortController` cuando el usuario cambia de filtro.
