import { useState } from 'react';
import useApi from '../hooks/useApi';
import { auditoriaApi } from '../api/servicios';
import { Cargando, EncabezadoPagina, ErrorCarga, Paginacion } from '../components/Comunes';

const ENTIDADES = [['', 'Todas'], ['venta', 'Ventas'], ['producto', 'Productos'], ['lote', 'Lotes'], ['cliente', 'Clientes'], ['proveedor', 'Proveedores'], ['usuario', 'Usuarios']];
const COLOR = { ANULAR: 'badge-err', DESACTIVAR: 'badge-err', CAMBIO_PRECIO: 'badge-warn', AJUSTE: 'badge-warn', CREAR: 'badge-ok', ENTRADA: 'badge-ok', ABONO: 'badge-info' };

function resumir(detalle) {
  if (!detalle) return '—';
  if (typeof detalle !== 'object') return String(detalle);
  if (detalle.antes && detalle.despues) return `Venta: $${detalle.antes.venta} → $${detalle.despues.venta}`;
  return Object.entries(detalle).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ');
}

export default function Auditoria() {
  const [entidad, setEntidad] = useState('');
  const [pagina, setPagina] = useState(1);
  const a = useApi((cfg) => auditoriaApi.listar({ entidad: entidad || undefined, pagina, limite: 20 }, cfg), [entidad, pagina]);
  return (
    <>
      <EncabezadoPagina titulo="Auditoría" subtitulo="Bitácora de operaciones críticas: anulaciones, ajustes, cambios de precio y de usuarios" />
      <section className="panel">
        <div className="filter-bar">
          <div className="filter-tabs">
            {ENTIDADES.map(([v, t]) => <button key={v} type="button" className={`filter-tab${entidad === v ? ' active' : ''}`} onClick={() => { setEntidad(v); setPagina(1); }}>{t}</button>)}
          </div>
        </div>
        {a.error && <ErrorCarga error={a.error} alReintentar={a.recargar} />}
        {!a.datos && !a.error && <Cargando lento={a.lento} />}
        {a.datos && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Fecha y hora</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Detalle</th></tr></thead>
              <tbody>
                {a.datos.datos.map((r) => (
                  <tr key={r.id}>
                    <td className="td-muted">{new Date(`${String(r.created_at).replace(' ', 'T')}${String(r.created_at).includes('Z') || String(r.created_at).includes('+') ? '' : 'Z'}`).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td>{r.usuario || 'Sistema'}</td>
                    <td><span className={`badge ${COLOR[r.accion] || 'badge-muted'}`}>{r.accion.replace('_', ' ').toLowerCase()}</span></td>
                    <td className="td-muted">{r.entidad}{r.entidad_id ? ` #${r.entidad_id}` : ''}</td>
                    <td className="td-muted celda-recortada" title={resumir(r.detalle)}>{resumir(r.detalle)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Paginacion meta={a.datos?.meta} alCambiar={setPagina} etiqueta="registros" />
      </section>
    </>
  );
}
