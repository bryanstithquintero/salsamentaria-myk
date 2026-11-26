import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, autenticado, avisoSesion } = useAuth();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const [form, setForm] = useState({ usuario: '', contrasena: '' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [lento, setLento] = useState(false);

  if (autenticado) return <Navigate to={ubicacion.state?.desde || '/'} replace />;

  const cambiar = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    if (!form.usuario.trim() || !form.contrasena) {
      setError('Ingrese su usuario y contraseña.');
      return;
    }
    setError('');
    setEnviando(true);
    const t = setTimeout(() => setLento(true), 4000);
    try {
      await login(form.usuario.trim(), form.contrasena);
      navegar(ubicacion.state?.desde || '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      clearTimeout(t);
      setLento(false);
      setEnviando(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-brand">
          <div className="login-brand-icon">M</div>
          <div>
            <div className="login-brand-name">Salsamentaria<br />MYK</div>
            <div className="login-brand-sub">Neiva · Huila</div>
          </div>
        </div>
        <div className="login-visual" aria-hidden="true">
          <div className="product-mosaic">
            {[['🥩', 'Cárnicos'], ['🧀', 'Quesos'], ['🥛', 'Lácteos'], ['🌿', 'Artesanal']].map(([e, n]) => (
              <div key={n} className="mosaic-cell"><span className="emoji">{e}</span><span className="mname">{n}</span></div>
            ))}
          </div>
        </div>
        <div className="login-tagline">
          <h1>Control de ventas<br />e inventario,<br /><em>hecho simple.</em></h1>
          <p>Sistema diseñado para la gestión diaria de la Salsamentaria MYK.</p>
        </div>
      </div>

      <div className="login-right">
        <form className="login-form" onSubmit={enviar} noValidate>
          <h2>Iniciar sesión</h2>
          <p className="login-subtitle">Ingresa con tu cuenta para administrar el negocio.</p>

          {(error || avisoSesion) && <div className="login-error visible" role="alert">{error || avisoSesion}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="usuario">Usuario o correo</label>
            <input className="form-input" id="usuario" name="usuario" type="text" autoComplete="username"
              placeholder="usuario@salsamentariamyk.com" value={form.usuario} onChange={cambiar} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="contrasena">Contraseña</label>
            <input className="form-input" id="contrasena" name="contrasena" type="password" autoComplete="current-password"
              placeholder="••••••••" value={form.contrasena} onChange={cambiar} />
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={enviando}>
            {enviando ? 'Ingresando…' : 'Iniciar sesión →'}
          </button>
          {lento && <p className="aviso-lento" style={{ marginTop: 12 }}>Activando el servidor… la primera conexión del día puede tardar hasta un minuto.</p>}

          <p className="login-footer">¿No tienes cuenta? Solicítala al administrador.</p>

          <div className="demo-box">
            <strong>Demo — credenciales de prueba</strong>
            Administrador: <code>admin</code> / <code>admin123</code><br />
            Vendedor: <code>vendedor</code> / <code>vendedor123</code>
          </div>
        </form>
      </div>
    </div>
  );
}
