/**
 * Estructura general: barra lateral de navegación + contenido de la ruta activa (<Outlet />).
 */
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { iniciales } from '../utils/formato';
import Icono from './Icono';

const MENU = [
  { seccion: 'Principal', items: [
    { a: '/', texto: 'Panel', icono: 'panel', fin: true },
    { a: '/productos', texto: 'Productos', icono: 'productos' },
    { a: '/inventario', texto: 'Inventario', icono: 'inventario' },
    { a: '/clientes', texto: 'Clientes', icono: 'clientes' },
    { a: '/proveedores', texto: 'Proveedores', icono: 'proveedores' },
  ] },
  { seccion: 'Ventas', items: [
    { a: '/ventas/nueva', texto: 'Realizar venta', icono: 'venta' },
    { a: '/ventas', texto: 'Historial de ventas', icono: 'historial', fin: true },
  ] },
  { seccion: 'Análisis', items: [
    { a: '/reportes', texto: 'Reportes', icono: 'reportes', admin: true },
  ] },
  { seccion: 'Sistema', items: [
    { a: '/usuarios', texto: 'Usuarios', icono: 'usuarios', admin: true },
    { a: '/auditoria', texto: 'Auditoría', icono: 'auditoria', admin: true },
    { a: '/acerca', texto: 'Acerca del sistema', icono: 'info' },
  ] },
];

export default function Layout() {
  const { usuario, esAdmin, logout } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const ubicacion = useLocation();
  const navegar = useNavigate();

  // Cierra el menú móvil al cambiar de página y sube al inicio.
  useEffect(() => {
    setMenuAbierto(false);
    window.scrollTo(0, 0);
  }, [ubicacion.pathname]);

  const salir = () => {
    logout();
    navegar('/login', { replace: true });
  };

  return (
    <div id="app">
      <a href="#contenido" className="skip-link">Saltar al contenido</a>
      <header className="topbar-movil">
        <button type="button" className="icon-btn" onClick={() => setMenuAbierto(true)} aria-label="Abrir menú"><Icono nombre="menu" tam={18} /></button>
        <span className="topbar-marca">MYK · Salsamentaria</span>
      </header>
      {menuAbierto && <div className="sidebar-fondo" onClick={() => setMenuAbierto(false)} aria-hidden="true" />}

      <aside className={`sidebar${menuAbierto ? ' abierto' : ''}`} aria-label="Navegación principal">
        <div className="sb-brand">
          <div className="sb-logo">
            <div className="sb-logo-icon">M</div>
            <div>
              <div className="sb-logo-name">MYK</div>
              <div className="sb-logo-sub">Salsamentaria</div>
            </div>
          </div>
        </div>
        <nav className="sb-nav">
          {MENU.map((sec) => {
            const items = sec.items.filter((i) => !i.admin || esAdmin);
            if (!items.length) return null;
            return (
              <div key={sec.seccion}>
                <span className="sb-section">{sec.seccion}</span>
                {items.map((i) => (
                  <NavLink key={i.a} to={i.a} end={i.fin} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                    <Icono nombre={i.icono} />
                    {i.texto}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="sb-footer">
          <div className="sb-avatar">{iniciales(usuario?.nombre)}</div>
          <div>
            <div className="sb-uname">{usuario?.nombre}</div>
            <div className="sb-urole">{esAdmin ? 'Administrador' : 'Vendedor'}</div>
          </div>
          <button type="button" className="sb-salir" onClick={salir} title="Cerrar sesión" aria-label="Cerrar sesión">
            <Icono nombre="salir" tam={14} grosor={2} />
          </button>
        </div>
      </aside>

      <main className="main" id="contenido">
        <div className="page">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
