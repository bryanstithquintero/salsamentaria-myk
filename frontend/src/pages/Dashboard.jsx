import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import useApi from '../hooks/useApi';
import { dashboardApi } from '../api/servicios';
import { useAuth } from '../context/AuthContext';
import { Cargando, EncabezadoPagina, ErrorCarga, Insignia, TarjetaIndicador } from '../components/Comunes';
import Icono from '../components/Icono';
import { fmtFechaCorta, fmtFechaLarga, fmtMoneda, fmtNumero } from '../utils/formato';

// La gráfica (Chart.js) se descarga aparte para no retrasar la carga del panel.
const GraficaVentas = lazy(() => import('../components/GraficaVentas'));

export default function Dashboard() {
  const { usuario } = useAuth();
  const [periodo, setPeriodo] = useState('7d');
  const resumen = useApi((cfg) => dashboardApi.resumen(cfg), []);
  const serie = useApi((cfg) => dashboardApi.ventas(periodo, cfg), [periodo]);
  const r = resumen.datos;

  const titulosPeriodo = { '7d': 'Ventas de los últimos 7 días', '30d': 'Ventas de los últimos 30 días', '90d': 'Ventas de los últimos 90 días (por semana)' };
  const variacion = r?.ventas_hoy.variacion_vs_ayer;

  return (
    <>
      <EncabezadoPagina titulo="Panel" subtitulo={r ? `Hola, ${usuario.nombre.split(' ')[0]} · ${fmtFechaLarga(r.fecha)}` : 'Resumen de la operación'}>
        <Link to="/ventas/nueva" className="btn btn-primary btn-sm"><Icono nombre="mas" tam={13} grosor={2.2} /> Nueva venta</Link>
      </EncabezadoPagina>

      {resumen.error && <ErrorCarga error={resumen.error} alReintentar={resumen.recargar} />}
      {resumen.cargando && !r && <Cargando filas={4} lento={resumen.lento} />}

      {r && (
        <>
          <div className="stats-grid mb-24">
            <TarjetaIndicador etiqueta="Ventas hoy" valor={fmtMoneda(r.ventas_hoy.monto)}
              meta={variacion === null ? `${r.ventas_hoy.cantidad} ventas` : `${variacion >= 0 ? '↑' : '↓'} ${Math.abs(variacion)} % vs. ayer · ${r.ventas_hoy.cantidad} ventas`}
              tono={variacion === null ? '' : variacion >= 0 ? 'up' : 'down'} />
            <TarjetaIndicador etiqueta="Productos en stock" valor={fmtNumero(r.inventario.unidades)} meta={`de ${r.inventario.referencias} referencias`} />
            <TarjetaIndicador etiqueta="Bajo stock" valor={r.inventario.bajo_stock} colorValor="var(--err)"
              meta={`${r.inventario.lotes_por_vencer} lotes vencen en 7 días`} tono="down" />
            <TarjetaIndicador etiqueta="Por cobrar (crédito)" valor={fmtMoneda(r.cartera.saldo)}
              meta={`${r.cartera.ventas} ventas · ${r.clientes_activos_30_dias} clientes activos`} />
          </div>

          <div className="grid-2-1 mb-24">
            <section className="panel" aria-labelledby="t-grafica">
              <div className="panel-header">
                <span className="panel-title" id="t-grafica">{titulosPeriodo[periodo]}</span>
                <div className="chart-tabs" role="tablist">
                  {['7d', '30d', '90d'].map((p) => (
                    <button key={p} type="button" role="tab" aria-selected={periodo === p}
                      className={`chart-tab${periodo === p ? ' active' : ''}`} onClick={() => setPeriodo(p)}>{p}</button>
                  ))}
                </div>
              </div>
              <div className="chart-wrap">
                {serie.datos ? (
                  <Suspense fallback={<div className="skeleton-row" style={{ height: '100%' }} />}>
                    <GraficaVentas etiquetas={serie.datos.etiquetas} valores={serie.datos.valores} />
                  </Suspense>
                ) : <div className="skeleton-row" style={{ height: '100%' }} />}
              </div>
              {serie.datos && (
                <div className="panel-footer chart-total">Total del período: <strong>{fmtMoneda(serie.datos.total)}</strong></div>
              )}
            </section>

            <section className="panel" aria-labelledby="t-bajo">
              <div className="panel-header">
                <span className="panel-title" id="t-bajo">Bajo stock</span>
                <span className="badge badge-err">{r.inventario.bajo_stock} ítems</span>
              </div>
              <div className="panel-body" style={{ padding: '4px 20px' }}>
                {r.bajo_stock.length === 0 && <p className="text-muted" style={{ padding: '16px 0', fontSize: 13 }}>Todo el inventario está sobre el mínimo.</p>}
                {r.bajo_stock.map((p) => (
                  <div key={p.id} className="stock-item">
                    <div>
                      <div className="stock-name">{p.nombre}</div>
                      <div className="stock-code">{p.codigo} · {p.presentacion}</div>
                    </div>
                    <span className="badge badge-warn">{p.stock} {p.unidad === 'libra' ? 'lb' : 'und'}</span>
                  </div>
                ))}
              </div>
              <div className="panel-footer"><Link to="/inventario" style={{ fontSize: 13 }}>Ver alertas de inventario →</Link></div>
            </section>
          </div>

          <section className="panel" aria-labelledby="t-recientes">
            <div className="panel-header">
              <span className="panel-title" id="t-recientes">Ventas recientes</span>
              <Link to="/ventas" style={{ fontSize: 13 }}>Ver historial completo →</Link>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Venta</th><th>Fecha</th><th>Cliente</th><th>Productos</th><th className="text-right">Cant.</th><th className="text-right">Total</th><th>Estado</th></tr></thead>
                <tbody>
                  {r.ventas_recientes.map((v) => (
                    <tr key={v.id}>
                      <td className="td-code">{v.consecutivo}</td>
                      <td className="td-muted">{fmtFechaCorta(v.fecha, v.hora)}</td>
                      <td>{v.cliente || 'Cliente eventual'}</td>
                      <td className="td-muted celda-recortada">{v.productos}</td>
                      <td className="text-right">{v.unidades}</td>
                      <td className="text-right td-price">{fmtMoneda(v.total)}</td>
                      <td><Insignia estado={v.estado} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
