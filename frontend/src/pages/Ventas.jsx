import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import useApi from '../hooks/useApi';
import useDebounce from '../hooks/useDebounce';
import { ventasApi } from '../api/servicios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  CajaBusqueda, Campo, Cargando, EncabezadoPagina, ErrorCarga, Insignia, Modal, Paginacion, TarjetaIndicador, Vacio,
} from '../components/Comunes';
import Icono from '../components/Icono';
import { fmtFechaCorta, fmtMoneda, hoyISO, MEDIOS_PAGO, sumarDias } from '../utils/formato';

const RANGOS = {
  hoy: ['Hoy', () => [hoyISO(), hoyISO()]],
  '7': ['Últimos 7 días', () => [sumarDias(hoyISO(), -6), hoyISO()]],
  '30': ['Últimos 30 días', () => [sumarDias(hoyISO(), -29), hoyISO()]],
  mes: ['Este mes', () => [`${hoyISO().slice(0, 8)}01`, hoyISO()]],
  todo: ['Todo el historial', () => [undefined, undefined]],
};

export default function Ventas() {
  const [rango, setRango] = useState('30');
  const [estado, setEstado] = useState('');
  const [buscar, setBuscar] = useState('');
  const [pagina, setPagina] = useState(1);
  const [detalleId, setDetalleId] = useState(null);
  const termino = useDebounce(buscar);

  const params = useMemo(() => {
    const [desde, hasta] = RANGOS[rango][1]();
    return { desde, hasta, estado: estado || undefined, buscar: termino || undefined, pagina, limite: 12 };
  }, [rango, estado, termino, pagina]);
  const lista = useApi((cfg) => ventasApi.listar(params, cfg), [params]);
  const r = lista.datos?.meta.resumen;

  const reiniciar = (fn) => (v) => { fn(v); setPagina(1); };

  return (
    <>
      <EncabezadoPagina titulo="Historial de ventas" subtitulo={r ? `${lista.datos.meta.total} ventas · ${fmtMoneda(r.monto)} vendidos (sin anuladas)` : 'Consulta de ventas registradas'}>
        <CajaBusqueda valor={buscar} alCambiar={reiniciar(setBuscar)} placeholder="Buscar venta, cliente o producto…" />
        <Link to="/ventas/nueva" className="btn btn-primary btn-sm"><Icono nombre="mas" tam={13} grosor={2.2} /> Registrar venta</Link>
      </EncabezadoPagina>

      <div className="hist-filters">
        <div className="hf-group">
          <label className="hf-label" htmlFor="rango">Rango:</label>
          <select id="rango" className="hf-select" value={rango} onChange={(e) => reiniciar(setRango)(e.target.value)}>
            {Object.entries(RANGOS).map(([k, [t]]) => <option key={k} value={k}>{t}</option>)}
          </select>
        </div>
        <div className="hf-divider" />
        <div className="hf-group">
          <span className="hf-label">Estado:</span>
          <div className="status-btns">
            {[['', 'Todas'], ['pagada', 'Pagadas'], ['pendiente', 'Pendientes'], ['anulada', 'Anuladas']].map(([v, t]) => (
              <button key={v} type="button" className={`st-btn${estado === v ? ' active' : ''}`} onClick={() => reiniciar(setEstado)(v)}>{t}</button>
            ))}
          </div>
        </div>
        {(estado || buscar || rango !== '30') && (
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => { setEstado(''); setBuscar(''); setRango('30'); setPagina(1); }}>Limpiar filtros</button>
        )}
      </div>

      {r && (
        <div className="stats-grid mb-24">
          <TarjetaIndicador etiqueta="Ventas en período" valor={r.ventas} />
          <TarjetaIndicador etiqueta="Monto total" valor={fmtMoneda(r.monto)} />
          <TarjetaIndicador etiqueta="Ticket promedio" valor={fmtMoneda(r.ticket_promedio)} />
          <TarjetaIndicador etiqueta="Producto más vendido" valor={<span className="valor-texto">{r.producto_top || '—'}</span>} />
        </div>
      )}

      <section className="panel">
        {lista.error && <ErrorCarga error={lista.error} alReintentar={lista.recargar} />}
        {!lista.datos && !lista.error && <Cargando filas={8} lento={lista.lento} />}
        {lista.datos && lista.datos.datos.length === 0 && <Vacio titulo="No hay ventas" texto="No se encontraron ventas con estos filtros." icono="historial" />}
        {lista.datos && lista.datos.datos.length > 0 && (
          <div className={`table-wrap${lista.cargando ? ' actualizando' : ''}`}>
            <table>
              <thead><tr><th>Venta</th><th>Fecha</th><th>Cliente</th><th>Productos</th><th className="text-right">Cant.</th><th className="text-right">Total</th><th>Pago</th><th>Estado</th><th /></tr></thead>
              <tbody>
                {lista.datos.datos.map((v) => (
                  <tr key={v.id} className={`fila-clic${v.estado === 'pendiente' ? ' tr-warn' : ''}`} onClick={() => setDetalleId(v.id)}>
                    <td className="td-code">{v.consecutivo}</td>
                    <td className="td-muted">{fmtFechaCorta(v.fecha, v.hora)}</td>
                    <td>{v.cliente || 'Cliente eventual'}</td>
                    <td className="td-muted celda-recortada" title={v.productos}>{v.productos}</td>
                    <td className="text-right">{v.unidades}</td>
                    <td className="text-right td-price">{fmtMoneda(v.total)}{v.saldo > 0 && <div className="text-warn" style={{ fontSize: 11 }}>debe {fmtMoneda(v.saldo)}</div>}</td>
                    <td className="td-muted">{MEDIOS_PAGO[v.medio_pago]}</td>
                    <td><Insignia estado={v.estado} /></td>
                    <td><button type="button" className="icon-btn" aria-label={`Ver detalle de ${v.consecutivo}`}><Icono nombre="flecha" tam={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Paginacion meta={lista.datos?.meta} alCambiar={setPagina} etiqueta="ventas" />
      </section>

      {detalleId && <DetalleVenta id={detalleId} alCerrar={() => setDetalleId(null)} alCambiar={lista.recargar} />}
    </>
  );
}

export function DetalleVenta({ id, alCerrar, alCambiar }) {
  const { esAdmin } = useAuth();
  const toast = useToast();
  const v = useApi((cfg) => ventasApi.obtener(id, cfg), [id]);
  const [accion, setAccion] = useState(null); // 'anular' | 'abono'
  const [motivo, setMotivo] = useState('');
  const [abono, setAbono] = useState({ valor: '', medio_pago: 'efectivo' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const ejecutar = async () => {
    setError('');
    if (accion === 'anular' && motivo.trim().length < 5) return setError('Indique el motivo (mínimo 5 caracteres)');
    if (accion === 'abono' && !(Number(abono.valor) > 0)) return setError('Ingrese un valor mayor que cero');
    if (accion === 'abono' && Number(abono.valor) > v.datos.saldo) return setError(`El abono no puede superar el saldo (${fmtMoneda(v.datos.saldo)})`);
    setEnviando(true);
    try {
      const r = accion === 'anular' ? await ventasApi.anular(id, motivo.trim()) : await ventasApi.abonar(id, Number(abono.valor), abono.medio_pago);
      v.setDatos(r);
      toast.exito(accion === 'anular' ? `Venta ${r.consecutivo} anulada; el inventario se reintegró` : r.estado === 'pagada' ? 'Abono registrado: la venta quedó pagada' : 'Abono registrado');
      setAccion(null);
      alCambiar?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
    return undefined;
  };

  const d = v.datos;
  return (
    <Modal abierto titulo={d ? `Venta ${d.consecutivo}` : 'Venta'} alCerrar={alCerrar} ancho={600}
      pie={d && !accion && (
        <>
          {d.estado === 'pendiente' && <button type="button" className="btn btn-accent" onClick={() => setAccion('abono')}>Registrar abono</button>}
          {esAdmin && d.estado !== 'anulada' && <button type="button" className="btn btn-danger" onClick={() => setAccion('anular')}>Anular venta</button>}
          <button type="button" className="btn btn-outline" onClick={() => window.print()}><Icono nombre="imprimir" tam={14} /> Imprimir</button>
        </>
      )}>
      {v.error && <ErrorCarga error={v.error} alReintentar={v.recargar} />}
      {!d && !v.error && <Cargando filas={4} />}
      {d && (
        <div className="recibo">
          <div className="detalle-cabecera">
            <div><span className="hf-label">Fecha</span><strong>{fmtFechaCorta(d.fecha, d.hora)}</strong></div>
            <div><span className="hf-label">Cliente</span><strong>{d.cliente || 'Cliente eventual'}</strong></div>
            <div><span className="hf-label">Vendedor</span><strong>{d.vendedor}</strong></div>
            <div><span className="hf-label">Estado</span><Insignia estado={d.estado} /></div>
          </div>
          <table className="tabla-resumen">
            <thead><tr><th>Producto</th><th className="text-right">Cant.</th><th className="text-right">Precio</th><th className="text-right">Subtotal</th></tr></thead>
            <tbody>
              {d.items.map((i) => (
                <tr key={i.id}><td>{i.producto} <span className="td-code">{i.codigo}</span></td><td className="text-right">{i.cantidad}</td><td className="text-right">{fmtMoneda(i.precio_unitario)}</td><td className="text-right">{fmtMoneda(i.subtotal)}</td></tr>
              ))}
            </tbody>
            <tfoot><tr><th colSpan={3}>Total · {MEDIOS_PAGO[d.medio_pago]}</th><th className="text-right">{fmtMoneda(d.total)}</th></tr></tfoot>
          </table>

          {d.abonos.length > 0 && (
            <>
              <h3 className="subtitulo-modal">Abonos</h3>
              <ul className="lista-simple">
                {d.abonos.map((a) => <li key={a.id}><span>{fmtFechaCorta(a.fecha)} · {MEDIOS_PAGO[a.medio_pago]} · {a.usuario}</span><strong>{fmtMoneda(a.valor)}</strong></li>)}
                <li className="saldo"><span>Saldo pendiente</span><strong>{fmtMoneda(d.saldo)}</strong></li>
              </ul>
            </>
          )}
          {d.lotes.length > 0 && (
            <p className="nota-lotes">Lotes afectados (FEFO): {d.lotes.filter((l) => l.tipo === 'venta').map((l) => `${l.codigo_lote || `#${l.lote_id}`} (${Math.abs(l.cantidad)})`).join(', ')}</p>
          )}
          {d.estado === 'anulada' && <div className="alerta-error"><strong>Anulada</strong> por {d.anulada_por_nombre}: {d.motivo_anulacion}</div>}

          {accion === 'anular' && (
            <div className="accion-modal">
              <Campo etiqueta="Motivo de la anulación *" id="motivo" error={error}>
                <textarea id="motivo" className="form-textarea" rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: el cliente devolvió el producto" />
              </Campo>
              <p className="form-hint">Las unidades vuelven a los mismos lotes de los que salieron.</p>
              <div className="form-actions-modal">
                <button type="button" className="btn btn-outline" onClick={() => setAccion(null)}>Cancelar</button>
                <button type="button" className="btn btn-danger" onClick={ejecutar} disabled={enviando}>{enviando ? 'Anulando…' : 'Confirmar anulación'}</button>
              </div>
            </div>
          )}
          {accion === 'abono' && (
            <div className="accion-modal">
              <div className="form-row form-row-2">
                <Campo etiqueta={`Valor (saldo ${fmtMoneda(d.saldo)})`} id="abono" error={error}>
                  <input id="abono" className="form-input" type="number" min="1" max={d.saldo} value={abono.valor} onChange={(e) => setAbono((a) => ({ ...a, valor: e.target.value }))} />
                </Campo>
                <Campo etiqueta="Medio de pago" id="abono-medio">
                  <select id="abono-medio" className="form-select" value={abono.medio_pago} onChange={(e) => setAbono((a) => ({ ...a, medio_pago: e.target.value }))}>
                    {['efectivo', 'transferencia', 'tarjeta'].map((m) => <option key={m} value={m}>{MEDIOS_PAGO[m]}</option>)}
                  </select>
                </Campo>
              </div>
              <div className="form-actions-modal">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAbono((a) => ({ ...a, valor: String(d.saldo) }))}>Pagar todo</button>
                <button type="button" className="btn btn-outline" onClick={() => setAccion(null)}>Cancelar</button>
                <button type="button" className="btn btn-primary" onClick={ejecutar} disabled={enviando}>{enviando ? 'Guardando…' : 'Registrar abono'}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
