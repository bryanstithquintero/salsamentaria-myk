/** Formulario de cliente reutilizado en Clientes y en el punto de venta. */
import { useState } from 'react';
import { clientesApi } from '../api/servicios';
import { useToast } from '../context/ToastContext';
import { Campo } from './Comunes';

const VACIO = { nombre: '', documento: '', telefono: '', correo: '', direccion: '', autoriza_datos: false };

export default function FormCliente({ cliente, alGuardar, alCancelar }) {
  const toast = useToast();
  const [f, setF] = useState(cliente ? { ...VACIO, ...Object.fromEntries(Object.entries(cliente).map(([k, v]) => [k, v ?? ''])) } : VACIO);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  const cambiar = (e) => {
    const { name, value, type, checked } = e.target;
    setF((x) => ({ ...x, [name]: type === 'checkbox' ? checked : value }));
  };

  const guardar = async (e) => {
    e.preventDefault();
    const er = {};
    if (f.nombre.trim().length < 3) er.nombre = 'Mínimo 3 caracteres';
    if (f.documento && !/^[0-9A-Za-z-]{5,20}$/.test(f.documento.trim())) er.documento = 'Documento no válido';
    if (f.telefono && !/^[0-9 +()-]{7,20}$/.test(f.telefono.trim())) er.telefono = 'Teléfono no válido';
    if (f.correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.correo.trim())) er.correo = 'Correo no válido';
    setErrores(er);
    if (Object.keys(er).length) return;
    const cuerpo = {
      nombre: f.nombre.trim(), documento: f.documento.trim(), telefono: f.telefono.trim(), correo: f.correo.trim(),
      direccion: f.direccion.trim() || null, autoriza_datos: Boolean(f.autoriza_datos),
    };
    setEnviando(true);
    try {
      const r = cliente ? await clientesApi.actualizar(cliente.id, cuerpo) : await clientesApi.crear(cuerpo);
      toast.exito(cliente ? 'Cliente actualizado' : `Cliente ${r.nombre} registrado`);
      alGuardar(r);
    } catch (err) {
      setErrores(err.porCampo);
      toast.error(err.status === 409 ? 'Ya existe un cliente con ese documento' : err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={guardar} noValidate>
      <Campo etiqueta="Nombre completo *" id="c-nombre" error={errores.nombre}>
        <input className="form-input" id="c-nombre" name="nombre" value={f.nombre} onChange={cambiar} />
      </Campo>
      <div className="form-row form-row-2">
        <Campo etiqueta="Documento / NIT" id="c-doc" error={errores.documento}>
          <input className="form-input" id="c-doc" name="documento" value={f.documento} onChange={cambiar} />
        </Campo>
        <Campo etiqueta="Teléfono" id="c-tel" error={errores.telefono}>
          <input className="form-input" id="c-tel" name="telefono" type="tel" value={f.telefono} onChange={cambiar} />
        </Campo>
      </div>
      <div className="form-row form-row-2">
        <Campo etiqueta="Correo" id="c-correo" error={errores.correo}>
          <input className="form-input" id="c-correo" name="correo" type="email" value={f.correo} onChange={cambiar} />
        </Campo>
        <Campo etiqueta="Dirección" id="c-dir">
          <input className="form-input" id="c-dir" name="direccion" value={f.direccion} onChange={cambiar} />
        </Campo>
      </div>
      <label className="check-label autorizacion">
        <input type="checkbox" name="autoriza_datos" checked={f.autoriza_datos} onChange={cambiar} />
        El cliente autoriza el tratamiento de sus datos personales para la gestión de ventas y cartera (Ley 1581 de 2012).
      </label>
      <div className="form-actions-modal">
        <button type="button" className="btn btn-outline" onClick={alCancelar}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar cliente'}</button>
      </div>
    </form>
  );
}
