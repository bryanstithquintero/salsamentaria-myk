/**
 * Contexto de autenticación (Context API).
 * Comparte el usuario actual, el estado de la sesión y las acciones login/logout
 * con cualquier componente, sin pasar props por toda la jerarquía.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/servicios';
import { almacenToken, suscribirExpiracion } from '../api/cliente';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(() => Boolean(almacenToken.leer()));
  const [avisoSesion, setAvisoSesion] = useState('');

  // Al abrir la app, si hay un token guardado se valida contra la API.
  useEffect(() => {
    if (!almacenToken.leer()) return undefined;
    let activo = true;
    authApi.perfil()
      .then((u) => activo && setUsuario(u))
      .catch(() => almacenToken.borrar())
      .finally(() => activo && setCargando(false));
    return () => { activo = false; };
  }, []);

  const logout = useCallback((mensaje = '') => {
    almacenToken.borrar();
    setUsuario(null);
    setAvisoSesion(mensaje);
  }, []);

  // Si la API responde 401 (token vencido o usuario desactivado) se cierra la sesión.
  useEffect(() => suscribirExpiracion((msg) => logout(msg || 'Su sesión expiró. Inicie sesión de nuevo.')), [logout]);

  const login = useCallback(async (usuarioOCorreo, contrasena) => {
    const { token, usuario: u } = await authApi.login(usuarioOCorreo, contrasena);
    almacenToken.guardar(token);
    setAvisoSesion('');
    setUsuario(u);
    return u;
  }, []);

  const valor = useMemo(() => ({
    usuario,
    cargando,
    avisoSesion,
    autenticado: Boolean(usuario),
    esAdmin: usuario?.rol === 'admin',
    login,
    logout,
  }), [usuario, cargando, avisoSesion, login, logout]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
