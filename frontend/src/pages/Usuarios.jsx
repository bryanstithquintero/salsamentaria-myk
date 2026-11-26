import { useState } from 'react';
import useApi from '../hooks/useApi';
import { usuariosApi } from '../api/servicios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Campo, Cargando, EncabezadoPagina, ErrorCarga, Insignia, Modal } from '../components/Comunes';
import Icono from '../components/Icono';
import { fmtFechaCorta, iniciales } from '../utils/formato';

export default function Usuarios() {
  const { usuario: yo } = useAuth();
  const toast = useToast();
  const lista = useApi((cfg) => usuariosApi.listar(cfg), []);
  const [modal, setModal] = useState(null); // { tipo: 'crear'|'editar'|'clave', u }

  const alternar = async (u) => {
    try {
      await usuariosApi.actualizar(u.id, { activo: !u.activo });
      toast.exito(`${u.nombre} ${u.activo ? 'desactivado' : 'activado'}`);
      lista.recargar();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <>
      <EncabezadoPagina titulo="Usuarios" subtitulo="Cuentas de acceso y roles del sistema">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setModal({ tipo: 'crear' })}><Icono nombre="mas" tam={13} grosor={2.2} /> Nuevo usuario</button>
      </EncabezadoPagina>
      <section className="panel">
        {lista.error && <ErrorCarga error={lista.error} alReintentar={lista.recargar} />}
        {!lista.datos && !lista.error && <Cargando lento={lista.lento} />}
        {lista.datos && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nombre</th><th>Usuario</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Creado</th><th /></tr></thead>
              <tbody>
                {lista.datos.map((u) => (
                  <tr key={u.id}>
                    <td className="td-bold"><span className="avatar-mini">{iniciales(u.nombre)}</span>{u.nombre}{u.id === yo.id && <span className="td-muted"> (usted)</span>}</td>
                    <td className="td-code">{u.usuario}</td>
                    <td className="td-muted">{u.correo || '—'}</td>
                    <td><Insignia estado={u.rol} /></td>
                    <td><Insignia estado={u.activo ? 'activo' : 'inactivo'} /></td>
                    <td className="td-muted">{fmtFechaCorta(String(u.creado).slice(0, 10))}</td>
                    <td className="acciones">
                      <button type="button" className="icon-btn" title="Editar" aria-label={`Editar ${u.nombre}`} onClick={() => setModal({ tipo: 'editar', u })}><Icono nombre="editar" tam={13} /></button>
                      <button type="button" className="icon-btn" title="Restablecer contraseña" aria-label={`Restablecer contraseña de ${u.nombre}`} onClick={() => setModal({ tipo: 'clave', u })}><Icono nombre="llave" tam={13} /></button>
                      {u.id !== yo.id && <button type="button" className="btn btn-ghost btn-sm" onClick={() => alternar(u)}>{u.activo ? 'Desactivar' : 'Activar'}</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {modal && <ModalUsuario modal={modal} esYo={modal.u?.id === yo.id} alCerrar={() => setModal(null)} alGuardar={() => { setModal(null); lista.recargar(); }} />}
    </>
  );
}

function ModalUsuario({ modal, esYo, alCerrar, alGuardar }) {
  const toast = useToast();
  const { tipo, u } = modal;
  const [f, setF] = useState({ nombre: u?.nombre || '', usuario: u?.usuario || '', correo: u?.correo || '', rol: u?.rol || 'vendedor', contrasena: '' });
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const cambiar = (e) => setF((x) => ({ ...x, [e.target.name]: e.target.value }));

  const guardar = async () => {
    const er = {};
    if (tipo !== 'clave' && f.nombre.trim().length < 3) er.nombre = 'Mínimo 3 caracteres';
    if (tipo === 'crear' && !/^[a-z0-9._-]{3,40}$/i.test(f.usuario.trim())) er.usuario = 'Solo letras, números, punto o guion';
    if (tipo !== 'editar' && f.contrasena.length < 8) er.contrasena = 'Mínimo 8 caracteres';
    if (f.correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.correo)) er.correo = 'Correo no válido';
    setErrores(er);
    if (Object.keys(er).length) return;
    setEnviando(true);
    try {
      if (tipo === 'crear') await usuariosApi.crear({ nombre: f.nombre.trim(), usuario: f.usuario.trim(), correo: f.correo || null, rol: f.rol, contrasena: f.contrasena });
      if (tipo === 'editar') await usuariosApi.actualizar(u.id, { nombre: f.nombre.trim(), correo: f.correo || null, rol: f.rol });
      if (tipo === 'clave') await usuariosApi.restablecer(u.id, f.contrasena);
      toast.exito(tipo === 'crear' ? 'Usuario creado' : tipo === 'editar' ? 'Usuario actualizado' : 'Contraseña restablecida');
      alGuardar();
    } catch (e) {
      setErrores(e.porCampo);
      toast.error(e.status === 409 ? 'El usuario o el correo ya existen' : e.message);
    } finally {
      setEnviando(false);
    }
  };

  const titulos = { crear: 'Nuevo usuario', editar: `Editar ${u?.nombre}`, clave: `Restablecer contraseña de ${u?.nombre}` };
  return (
    <Modal abierto titulo={titulos[tipo]} alCerrar={alCerrar}
      pie={<><button type="button" className="btn btn-outline" onClick={alCerrar}>Cancelar</button><button type="button" className="btn btn-primary" onClick={guardar} disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar'}</button></>}>
      {tipo !== 'clave' && (
        <>
          <Campo etiqueta="Nombre completo *" id="u-nombre" error={errores.nombre}><input className="form-input" id="u-nombre" name="nombre" value={f.nombre} onChange={cambiar} /></Campo>
          <div className="form-row form-row-2">
            <Campo etiqueta="Usuario *" id="u-usuario" error={errores.usuario}><input className="form-input" id="u-usuario" name="usuario" value={f.usuario} onChange={cambiar} disabled={tipo === 'editar'} /></Campo>
            <Campo etiqueta="Rol *" id="u-rol" ayuda={esYo ? 'No puede quitarse el rol de administrador' : undefined}>
              <select className="form-select" id="u-rol" name="rol" value={f.rol} onChange={cambiar} disabled={esYo}>
                <option value="vendedor">Vendedor</option><option value="admin">Administrador</option>
              </select>
            </Campo>
          </div>
          <Campo etiqueta="Correo" id="u-correo" error={errores.correo}><input className="form-input" id="u-correo" name="correo" type="email" value={f.correo} onChange={cambiar} /></Campo>
        </>
      )}
      {tipo !== 'editar' && (
        <Campo etiqueta={tipo === 'clave' ? 'Nueva contraseña *' : 'Contraseña *'} id="u-clave" error={errores.contrasena} ayuda="Mínimo 8 caracteres">
          <input className="form-input" id="u-clave" name="contrasena" type="password" autoComplete="new-password" value={f.contrasena} onChange={cambiar} />
        </Campo>
      )}
    </Modal>
  );
}
