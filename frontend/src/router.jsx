/**
 * Rutas de la aplicación (React Router).
 * Cada página se carga de forma diferida (lazy): el navegador descarga solo el código
 * de la pantalla que se visita, lo que reduce el tiempo de carga inicial.
 */
import { createBrowserRouter } from 'react-router-dom';
import Layout from './components/Layout';
import { RequiereAdmin, RequiereSesion } from './components/Guardas';
import ErrorRuta from './pages/ErrorRuta';

const Cargando = () => <div className="pantalla-carga"><div className="spinner" aria-label="Cargando" /></div>;

const pagina = (cargar) => async () => {
  const modulo = await cargar();
  return { Component: modulo.default };
};

export const rutas = [
  { path: '/login', lazy: pagina(() => import('./pages/Login')), hydrateFallbackElement: <Cargando /> },
  {
    element: <RequiereSesion />,
    errorElement: <ErrorRuta />,
    hydrateFallbackElement: <Cargando />,
    children: [{
      element: <Layout />,
      children: [
        { index: true, lazy: pagina(() => import('./pages/Dashboard')) },
        { path: 'productos', lazy: pagina(() => import('./pages/Productos')) },
        { path: 'productos/nuevo', lazy: pagina(() => import('./pages/ProductoForm')) },
        { path: 'productos/:id/editar', lazy: pagina(() => import('./pages/ProductoForm')) },
        { path: 'inventario', lazy: pagina(() => import('./pages/Inventario')) },
        { path: 'clientes', lazy: pagina(() => import('./pages/Clientes')) },
        { path: 'proveedores', lazy: pagina(() => import('./pages/Proveedores')) },
        { path: 'ventas', lazy: pagina(() => import('./pages/Ventas')) },
        { path: 'ventas/nueva', lazy: pagina(() => import('./pages/NuevaVenta')) },
        { path: 'acerca', lazy: pagina(() => import('./pages/Acerca')) },
        {
          element: <RequiereAdmin />,
          children: [
            { path: 'reportes', lazy: pagina(() => import('./pages/Reportes')) },
            { path: 'usuarios', lazy: pagina(() => import('./pages/Usuarios')) },
            { path: 'auditoria', lazy: pagina(() => import('./pages/Auditoria')) },
          ],
        },
        { path: '*', lazy: pagina(() => import('./pages/NoEncontrada')) },
      ],
    }],
  },
];

export const router = createBrowserRouter(rutas, { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' });
