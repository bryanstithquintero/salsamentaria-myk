/**
 * Rutas protegidas: exigen sesión iniciada y, opcionalmente, un rol.
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Vacio } from './Comunes';

export function RequiereSesion() {
  const { autenticado, cargando } = useAuth();
  const ubicacion = useLocation();
  if (cargando) return <div className="pantalla-carga"><div className="spinner" aria-label="Cargando" /></div>;
  if (!autenticado) return <Navigate to="/login" replace state={{ desde: ubicacion.pathname }} />;
  return <Outlet />;
}

export function RequiereAdmin() {
  const { esAdmin } = useAuth();
  if (!esAdmin) {
    return <Vacio icono="auditoria" titulo="Acceso restringido" texto="Esta sección es exclusiva del administrador." />;
  }
  return <Outlet />;
}
