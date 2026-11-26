import { lazy, Suspense, useMemo, useState } from 'react';
import useApi from '../hooks/useApi';
import { reportesApi } from '../api/servicios';
import { useToast } from '../context/ToastContext';
import { Cargando, EncabezadoPagina, ErrorCarga, TarjetaIndicador } from '../components/Comunes';
import Icono from '../components/Icono';
import { fmtFechaCorta, fmtMoneda, hoyISO, MEDIOS_PAGO, sumarDias } from '../utils/formato';

const GraficaVentas = lazy(() => import('../components/GraficaVentas'));

const PRESETS = [['7', 'Últimos 7 días'], ['30', 'Últimos 30 días'], ['90', 'Últimos 90 días'], ['mes', 'Este mes']];

export default function Reportes() {
  const toast = useToast();
  const [desde, setDesde] = useState(sumarDias(hoyISO(), -29));
  const [hasta, setHasta] = useState(hoyISO());
  const rangoValido = desde <= hasta;
  const params = useMemo(() => ({ desde, hasta }), [desde, hasta]);
  const rep = useApi((cfg) => (rangoValido ? reportesApi.ventas(params, cfg) : Promise.resolve(null)), [params]);
  const d = rep.datos;

  const aplicar = (p) => {
    const h = hoyISO();
    setHasta(h);
    setDesde(p === 'mes' ? `${h.slice(0, 8)}01` : sumarDias(h, -(Number(p) - 1)));
  };

  const exportar = async () => {
    try {
      await reportesApi.exportarVentas(params);
      toast.exito('Reporte exportado a CSV');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const maxCategoria = Math.max(1, ...(d?.por_categoria.map((c) => c.ingresos) || [1]));
  const totalMedios = d?.por_medio_pago.reduce((s, m) => s + m.monto, 0) || 1;

  return (
    <>
      <EncabezadoPagina titulo="Reportes" subtitulo={`Ventas del ${fmtFechaCorta(desde)} al ${fmtFechaCorta(hasta)}`}>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => window.print()}><Icono nombre="imprimir" tam={13} /> Imprimir / PDF</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={exportar} disabled={!rangoValido}><Icono nombre="descargar" tam={13} grosor={2} /> Exportar CSV</button>
      </EncabezadoPagina>

      <div className="hist-filters no-imprimir">
        <div className="hf-group"><label className="hf-label" htmlFor="desde">Desde</label><input id="desde" type="date" className="hf-select" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} /></div>
        <div className="hf-group"><label className="hf-label" htmlFor="hasta">Hasta</label><input id="hasta" type="date" className="hf-select" value={hasta} max={hoyISO()} onChange={(e) => setHasta(e.target.value)} /></div>
        <div className="hf-divider" />
        <div className="status-btns">{PRESETS.map(([k, t]) => <button key={k} type="button" className="st-btn" onClick={() => aplicar(k)}>{t}</button>)}</div>
      </div>
      {!rangoValido && <p className="text-err mb-20">La fecha inicial debe ser anterior a la final.</p>}
      {rep.error && <ErrorCarga error={rep.error} alReintentar={rep.recargar} />}
      {rep.cargando && !d && <Cargando lento={rep.lento} />}

      {d && (
        <>
          <div className="stats-grid mb-24">
            <TarjetaIndicador etiqueta="Ventas" valor={d.resumen.ventas} meta={`${d.resumen.anuladas} anuladas (${fmtMoneda(d.resumen.monto_anulado)})`} />
            <TarjetaIndicador etiqueta="Ingresos" valor={fmtMoneda(d.resumen.monto)} tono="up" />
            <TarjetaIndicador etiqueta="Ticket promedio" valor={fmtMoneda(d.resumen.ticket_promedio)} />
            <TarjetaIndicador etiqueta="Por cobrar" valor={fmtMoneda(d.resumen.por_cobrar)} colorValor={d.resumen.por_cobrar ? 'var(--warn)' : undefined} />
          </div>

          <section className="panel mb-24">
            <div className="panel-header"><span className="panel-title">Ingresos por día</span></div>
            <div className="chart-wrap">
              <Suspense fallback={<div className="skeleton-row" style={{ height: '100%' }} />}>
                <GraficaVentas etiquetas={d.por_dia.map((x) => fmtFechaCorta(x.fecha))} valores={d.por_dia.map((x) => x.monto)} color="#24724A" />
              </Suspense>
            </div>
          </section>

          <div className="grid-2-1 mb-24">
            <section className="panel">
              <div className="panel-header"><span className="panel-title">Productos más vendidos</span></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>#</th><th>Producto</th><th className="text-right">Unidades</th><th className="text-right">Ingresos</th><th className="text-right">Utilidad</th></tr></thead>
                  <tbody>
                    {d.top_productos.map((p, i) => (
                      <tr key={p.id}><td className="td-muted">{i + 1}</td><td className="td-bold">{p.nombre} <span className="td-code">{p.codigo}</span></td><td className="text-right">{p.unidades}</td><td className="text-right td-price">{fmtMoneda(p.ingresos)}</td><td className="text-right text-ok">{fmtMoneda(p.utilidad)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <div>
              <section className="panel mb-20">
                <div className="panel-header"><span className="panel-title">Por medio de pago</span></div>
                <div className="panel-body">
                  {d.por_medio_pago.map((m) => (
                    <div key={m.medio_pago} className="barra-fila">
                      <div className="barra-etq"><span>{MEDIOS_PAGO[m.medio_pago]} ({m.ventas})</span><strong>{fmtMoneda(m.monto)}</strong></div>
                      <div className="barra"><span style={{ width: `${(m.monto / totalMedios) * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
              </section>
              <section className="panel mb-20">
                <div className="panel-header"><span className="panel-title">Por categoría</span></div>
                <div className="panel-body">
                  {d.por_categoria.map((c) => (
                    <div key={c.categoria} className="barra-fila">
                      <div className="barra-etq"><span>{c.categoria}</span><strong>{fmtMoneda(c.ingresos)}</strong></div>
                      <div className="barra acento"><span style={{ width: `${(c.ingresos / maxCategoria) * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
              </section>
              <section className="panel">
                <div className="panel-header"><span className="panel-title">Por vendedor</span></div>
                <ul className="lista-simple panel-body">
                  {d.por_vendedor.map((v) => <li key={v.nombre}><span>{v.nombre} · {v.ventas} ventas</span><strong>{fmtMoneda(v.monto)}</strong></li>)}
                </ul>
              </section>
            </div>
          </div>
        </>
      )}
    </>
  );
}
