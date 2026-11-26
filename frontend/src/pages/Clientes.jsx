import { useMemo, useState } from 'react';
import useApi from '../hooks/useApi';
import useDebounce from '../hooks/useDebounce';
import { clientesApi } from '../api/servicios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  CajaBusqueda, Cargando, EncabezadoPagina, ErrorCarga, Insignia, Modal, Paginacion, TarjetaIndicador, Vacio,
} from '../components/Comunes';
import Icono from '../components/Icono';
import FormCliente from '../components/FormCliente';
import { DetalleVenta } from './Ventas';
import { fmtFechaCorta, fmtMoneda, iniciales } from '../utils/formato';

export default function Clientes() {
  const { esAdmin } = useAuth();
  const toast = useToast();
  const [buscar, setBuscar] = useState('');
  const [conSaldo, setConSaldo] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [editando, setEditando] = useState(null); // {} = nuevo, objeto = edición
  const [fichaId, setFichaId] = useState(null);
  const termino = useDebounce(buscar);

  const params = useMemo(() => ({ buscar: termino || undefined, con_saldo: conSaldo || undefined, pagina, limite: 12 }), [termino, conSaldo, pagina]);
  const lista = useApi((cfg) => clientesApi.listar(params, cfg), [params]);
  const resumen = lista.datos?.meta.resumen;

  const desactivar = async (c) => {
    try {
      await clientesApi.desactivar(c.id);
      toast.exito(`${c.nombre} se desactivó`);
      lista.recargar();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <>
      <EncabezadoPagina titulo="Clientes" subtitulo="Ficha, historial de compras y saldo de crédito">
        <CajaBusqueda valor={buscar} alCambiar={(v) => { setBuscar(v); setPagina(1); }} placeholder="Nombre, documento o teléfono…" />
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditando({})}><Icono nombre="mas" tam={13} grosor={2.2} /> Nuevo cliente</button>
      </EncabezadoPagina>

      {resumen && (
        <div className="stats-grid mb-24" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <TarjetaIndicador etiqueta="Clientes registrados" valor={lista.datos.meta.total} />
          <TarjetaIndicador etiqueta="Activos (30 días)" valor={resumen.activos_30_dias} meta="con al menos una compra" tono="up" />
          <TarjetaIndicador etiqueta="Cartera por cobrar" valor={fmtMoneda(resumen.cartera)} colorValor={resumen.cartera ? 'var(--warn)' : undefined} meta="ventas a crédito pendientes" />
        </div>
      )}

      <section className="panel">
        <div className="filter-bar">
          <label className="check-label"><input type="checkbox" checked={conSaldo} onChange={(e) => { setConSaldo(e.target.checked); setPagina(1); }} /> Solo con saldo pendiente</label>
        </div>
        {lista.error && <ErrorCarga error={lista.error} alReintentar={lista.recargar} />}
        {!lista.datos && !lista.error && <Cargando lento={lista.lento} />}
        {lista.datos && lista.datos.datos.length === 0 && <Vacio titulo="Sin clientes" texto="No hay clientes con estos filtros." icono="clientes" />}
        {lista.datos && lista.datos.datos.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Cliente</th><th>Documento</th><th>Teléfono</th><th className="text-right">Compras</th><th className="text-right">Total comprado</th><th className="text-right">Saldo</th><th>Última compra</th><th /></tr></thead>
              <tbody>
                {lista.datos.datos.map((c) => (
                  <tr key={c.id} className={c.saldo ? 'tr-warn' : ''}>
                    <td>
                      <button type="button" className="enlace-celda" onClick={() => setFichaId(c.id)}>
                        <span className="avatar-mini">{iniciales(c.nombre)}</span>{c.nombre}
                      </button>
                    </td>
                    <td className="td-code">{c.documento || '—'}</td>
                    <td className="td-muted">{c.telefono || '—'}</td>
                    <td className="text-right">{c.compras}</td>
                    <td className="text-right td-price">{fmtMoneda(c.total_comprado)}</td>
                    <td className={`text-right ${c.saldo ? 'text-warn fw-600' : 'td-muted'}`}>{c.saldo ? fmtMoneda(c.saldo) : '—'}</td>
                    <td className="td-muted">{c.ultima_compra ? fmtFechaCorta(c.ultima_compra) : '—'}</td>
                    <td className="acciones">
                      <button type="button" className="icon-btn" aria-label={`Editar ${c.nombre}`} onClick={() => setEditando(c)}><Icono nombre="editar" tam={13} /></button>
                      {esAdmin && <button type="button" className="icon-btn danger" aria-label={`Desactivar ${c.nombre}`} disabled={c.saldo > 0} title={c.saldo ? 'Tiene saldo pendiente' : 'Desactivar'} onClick={() => desactivar(c)}><Icono nombre="eliminar" tam={13} /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Paginacion meta={lista.datos?.meta} alCambiar={setPagina} etiqueta="clientes" />
      </section>

      {editando && (
        <Modal abierto titulo={editando.id ? `Editar ${editando.nombre}` : 'Nuevo cliente'} alCerrar={() => setEditando(null)}>
          <FormCliente cliente={editando.id ? editando : null} alCancelar={() => setEditando(null)} alGuardar={() => { setEditando(null); lista.recargar(); }} />
        </Modal>
      )}
      {fichaId && <FichaCliente id={fichaId} alCerrar={() => setFichaId(null)} />}
    </>
  );
}

function FichaCliente({ id, alCerrar }) {
  const c = useApi((cfg) => clientesApi.obtener(id, cfg), [id]);
  const [ventaId, setVentaId] = useState(null);
  const d = c.datos;
  if (ventaId) return <DetalleVenta id={ventaId} alCerrar={() => setVentaId(null)} alCambiar={c.recargar} />;
  return (
    <Modal abierto titulo={d?.nombre || 'Cliente'} alCerrar={alCerrar} ancho={640}>
      {!d && <Cargando filas={4} />}
      {d && (
        <>
          <div className="detalle-cabecera">
            <div><span className="hf-label">Documento</span><strong>{d.documento || '—'}</strong></div>
            <div><span className="hf-label">Teléfono</span><strong>{d.telefono || '—'}</strong></div>
            <div><span className="hf-label">Compras</span><strong>{d.compras} · {fmtMoneda(d.total_comprado)}</strong></div>
            <div><span className="hf-label">Saldo</span><strong className={d.saldo ? 'text-warn' : ''}>{fmtMoneda(d.saldo)}</strong></div>
          </div>
          {d.favoritos.length > 0 && <p className="resumen-linea">Productos favoritos: {d.favoritos.map((f) => `${f.nombre} (${f.unidades})`).join(', ')}</p>}
          <p className="resumen-linea">Autorización de datos: <strong>{d.autoriza_datos ? 'Sí' : 'No'}</strong></p>
          <h3 className="subtitulo-modal">Historial de compras</h3>
          {d.ventas.length === 0 ? <p className="text-muted">Aún no registra compras.</p> : (
            <div className="table-wrap" style={{ maxHeight: 300 }}>
              <table>
                <thead><tr><th>Venta</th><th>Fecha</th><th className="text-right">Total</th><th>Estado</th></tr></thead>
                <tbody>
                  {d.ventas.map((v) => (
                    <tr key={v.id} className="fila-clic" onClick={() => setVentaId(v.id)}>
                      <td className="td-code">{v.consecutivo}</td><td className="td-muted">{fmtFechaCorta(v.fecha, v.hora)}</td>
                      <td className="text-right">{fmtMoneda(v.total)}</td><td><Insignia estado={v.estado} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
