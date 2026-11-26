import { useState } from 'react';
import useApi from '../hooks/useApi';
import useDebounce from '../hooks/useDebounce';
import { catalogoApi } from '../api/servicios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CajaBusqueda, Campo, Cargando, EncabezadoPagina, ErrorCarga, Modal, Vacio } from '../components/Comunes';
import Icono from '../components/Icono';
import { fmtFechaCorta, fmtMoneda } from '../utils/formato';

const VACIO = { nit: '', razon_social: '', contacto: '', telefono: '', correo: '', direccion: '' };

export default function Proveedores() {
  const { esAdmin } = useAuth();
  const [buscar, setBuscar] = useState('');
  const [editando, setEditando] = useState(null);
  const [verId, setVerId] = useState(null);
  const termino = useDebounce(buscar);
  const lista = useApi((cfg) => catalogoApi.proveedores({ buscar: termino || undefined, limite: 50 }, cfg), [termino]);

  return (
    <>
      <EncabezadoPagina titulo="Proveedores" subtitulo="Empresas que abastecen la salsamentaria">
        <CajaBusqueda valor={buscar} alCambiar={setBuscar} placeholder="Razón social o NIT…" />
        {esAdmin && <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditando(VACIO)}><Icono nombre="mas" tam={13} grosor={2.2} /> Nuevo proveedor</button>}
      </EncabezadoPagina>

      {lista.error && <ErrorCarga error={lista.error} alReintentar={lista.recargar} />}
      {!lista.datos && !lista.error && <Cargando lento={lista.lento} />}
      {lista.datos && lista.datos.datos.length === 0 && <Vacio titulo="Sin proveedores" icono="proveedores" />}
      <div className="tarjetas-proveedor">
        {lista.datos?.datos.map((p) => (
          <article key={p.id} className="panel proveedor">
            <div className="panel-body">
              <div className="proveedor-cab">
                <div className="avatar-prov"><Icono nombre="proveedores" tam={18} /></div>
                <div>
                  <h3>{p.razon_social}</h3>
                  <span className="td-code">NIT {p.nit}</span>
                </div>
              </div>
              <dl className="proveedor-datos">
                <div><dt>Contacto</dt><dd>{p.contacto || '—'}</dd></div>
                <div><dt>Teléfono</dt><dd>{p.telefono || '—'}</dd></div>
                <div><dt>Correo</dt><dd>{p.correo || '—'}</dd></div>
                <div><dt>Productos / lotes</dt><dd>{p.productos} productos · {p.lotes} entradas</dd></div>
              </dl>
            </div>
            <div className="panel-footer proveedor-pie">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setVerId(p.id)}>Ver entradas</button>
              {esAdmin && <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditando(p)}><Icono nombre="editar" tam={12} /> Editar</button>}
            </div>
          </article>
        ))}
      </div>

      {editando && <FormProveedor inicial={editando} alCerrar={() => setEditando(null)} alGuardar={() => { setEditando(null); lista.recargar(); }} />}
      {verId && <EntradasProveedor id={verId} alCerrar={() => setVerId(null)} />}
    </>
  );
}

function FormProveedor({ inicial, alCerrar, alGuardar }) {
  const toast = useToast();
  const [f, setF] = useState({ ...VACIO, ...Object.fromEntries(Object.entries(inicial).map(([k, v]) => [k, v ?? ''])) });
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const cambiar = (e) => setF((x) => ({ ...x, [e.target.name]: e.target.value }));

  const guardar = async () => {
    const er = {};
    if (!/^[0-9-]{5,20}$/.test(f.nit.trim())) er.nit = 'NIT no válido (solo números y guion)';
    if (f.razon_social.trim().length < 3) er.razon_social = 'Mínimo 3 caracteres';
    if (f.correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.correo)) er.correo = 'Correo no válido';
    setErrores(er);
    if (Object.keys(er).length) return;
    const cuerpo = Object.fromEntries(Object.keys(VACIO).map((k) => [k, f[k].trim()]));
    setEnviando(true);
    try {
      if (inicial.id) await catalogoApi.actualizarProveedor(inicial.id, cuerpo); else await catalogoApi.crearProveedor(cuerpo);
      toast.exito(inicial.id ? 'Proveedor actualizado' : 'Proveedor registrado');
      alGuardar();
    } catch (e) {
      setErrores(e.porCampo);
      toast.error(e.status === 409 ? 'Ya existe un proveedor con ese NIT' : e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal abierto titulo={inicial.id ? 'Editar proveedor' : 'Nuevo proveedor'} alCerrar={alCerrar}
      pie={<><button type="button" className="btn btn-outline" onClick={alCerrar}>Cancelar</button><button type="button" className="btn btn-primary" onClick={guardar} disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar'}</button></>}>
      <div className="form-row form-row-2">
        <Campo etiqueta="NIT *" id="p-nit" error={errores.nit}><input className="form-input" id="p-nit" name="nit" value={f.nit} onChange={cambiar} placeholder="900123456-1" /></Campo>
        <Campo etiqueta="Razón social *" id="p-rs" error={errores.razon_social}><input className="form-input" id="p-rs" name="razon_social" value={f.razon_social} onChange={cambiar} /></Campo>
      </div>
      <div className="form-row form-row-2">
        <Campo etiqueta="Contacto" id="p-cont"><input className="form-input" id="p-cont" name="contacto" value={f.contacto} onChange={cambiar} /></Campo>
        <Campo etiqueta="Teléfono" id="p-tel" error={errores.telefono}><input className="form-input" id="p-tel" name="telefono" value={f.telefono} onChange={cambiar} /></Campo>
      </div>
      <div className="form-row form-row-2">
        <Campo etiqueta="Correo" id="p-correo" error={errores.correo}><input className="form-input" id="p-correo" name="correo" type="email" value={f.correo} onChange={cambiar} /></Campo>
        <Campo etiqueta="Dirección" id="p-dir"><input className="form-input" id="p-dir" name="direccion" value={f.direccion} onChange={cambiar} /></Campo>
      </div>
    </Modal>
  );
}

function EntradasProveedor({ id, alCerrar }) {
  const p = useApi((cfg) => catalogoApi.proveedor(id, cfg), [id]);
  return (
    <Modal abierto titulo={p.datos ? `Entradas de ${p.datos.razon_social}` : 'Entradas'} alCerrar={alCerrar} ancho={640}>
      {!p.datos && <Cargando filas={4} />}
      {p.datos && (p.datos.entradas.length === 0 ? <p className="text-muted">Sin entradas registradas.</p> : (
        <div className="table-wrap" style={{ maxHeight: 360 }}>
          <table>
            <thead><tr><th>Fecha</th><th>Producto</th><th className="text-right">Cantidad</th><th className="text-right">Costo</th><th>Vence</th></tr></thead>
            <tbody>
              {p.datos.entradas.map((e) => (
                <tr key={e.id}><td className="td-muted">{fmtFechaCorta(e.fecha_ingreso)}</td><td className="td-bold">{e.producto}</td><td className="text-right">{e.cantidad_inicial}</td><td className="text-right">{fmtMoneda(e.costo_unitario)}</td><td className="td-muted">{e.fecha_vencimiento ? fmtFechaCorta(e.fecha_vencimiento) : '—'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </Modal>
  );
}
