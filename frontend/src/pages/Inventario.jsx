import { useState } from 'react';
import useApi from '../hooks/useApi';
import { catalogoApi, inventarioApi, productosApi } from '../api/servicios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Campo, Cargando, EncabezadoPagina, ErrorCarga, Modal, Paginacion, TarjetaIndicador, Vacio } from '../components/Comunes';
import Icono from '../components/Icono';
import { fmtFechaCorta, fmtMoneda, hoyISO } from '../utils/formato';

const PESTANAS = [['alertas', 'Alertas'], ['lotes', 'Lotes (FEFO)'], ['movimientos', 'Movimientos']];
const TIPOS = { entrada: ['badge-ok', 'Entrada'], venta: ['badge-info', 'Venta'], ajuste: ['badge-warn', 'Ajuste'], anulacion: ['badge-muted', 'Anulación'] };

export default function Inventario() {
  const { esAdmin } = useAuth();
  const [pestana, setPestana] = useState('alertas');
  const [modal, setModal] = useState(null); // { tipo: 'entrada'|'ajuste', valores }
  const [version, setVersion] = useState(0);
  const refrescar = () => setVersion((v) => v + 1);

  return (
    <>
      <EncabezadoPagina titulo="Inventario" subtitulo="Control por lotes con fecha de vencimiento · salida FEFO (primero vence, primero sale)">
        {esAdmin && <button type="button" className="btn btn-outline btn-sm" onClick={() => setModal({ tipo: 'ajuste' })}><Icono nombre="editar" tam={13} /> Ajuste</button>}
        {esAdmin && <button type="button" className="btn btn-primary btn-sm" onClick={() => setModal({ tipo: 'entrada' })}><Icono nombre="mas" tam={13} grosor={2.2} /> Registrar entrada</button>}
      </EncabezadoPagina>

      <div className="filter-tabs mb-20" role="tablist">
        {PESTANAS.map(([id, t]) => (
          <button key={id} type="button" role="tab" aria-selected={pestana === id} className={`filter-tab${pestana === id ? ' active' : ''}`} onClick={() => setPestana(id)}>{t}</button>
        ))}
      </div>

      {pestana === 'alertas' && <Alertas version={version} esAdmin={esAdmin} alDarDeBaja={(l) => setModal({ tipo: 'ajuste', valores: { producto_id: String(l.producto_id), lote_id: String(l.id), cantidad: String(l.cantidad_disponible), motivo: 'vencimiento', sentido: 'salida' } })} />}
      {pestana === 'lotes' && <Lotes version={version} />}
      {pestana === 'movimientos' && <Movimientos version={version} />}

      {modal?.tipo === 'entrada' && <ModalEntrada alCerrar={() => setModal(null)} alGuardar={() => { setModal(null); refrescar(); }} />}
      {modal?.tipo === 'ajuste' && <ModalAjuste inicial={modal.valores} alCerrar={() => setModal(null)} alGuardar={() => { setModal(null); refrescar(); }} />}
    </>
  );
}

function Alertas({ version, esAdmin, alDarDeBaja }) {
  const [dias, setDias] = useState(7);
  const a = useApi((cfg) => inventarioApi.alertas(dias, cfg), [dias, version]);
  if (a.error) return <ErrorCarga error={a.error} alReintentar={a.recargar} />;
  if (!a.datos) return <Cargando lento={a.lento} />;
  const { bajo_stock: bajo, por_vencer: porVencer, vencidos } = a.datos;
  return (
    <>
      <div className="stats-grid mb-24" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <TarjetaIndicador etiqueta="Bajo stock" valor={bajo.length} colorValor={bajo.length ? 'var(--err)' : undefined} meta="productos bajo el mínimo" tono="down" />
        <TarjetaIndicador etiqueta={`Vencen en ${dias} días`} valor={porVencer.length} colorValor={porVencer.length ? 'var(--warn)' : undefined} meta="lotes con existencias" />
        <TarjetaIndicador etiqueta="Vencidos" valor={vencidos.length} colorValor={vencidos.length ? 'var(--err)' : undefined} meta="deben darse de baja" tono="down" />
      </div>

      {vencidos.length > 0 && (
        <section className="panel mb-24 panel-alerta">
          <div className="panel-header"><span className="panel-title">Lotes vencidos con existencias</span></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Producto</th><th>Lote</th><th>Venció</th><th className="text-right">Disponible</th>{esAdmin && <th />}</tr></thead>
              <tbody>
                {vencidos.map((l) => (
                  <tr key={l.id}>
                    <td className="td-bold">{l.nombre} <span className="td-code">{l.codigo}</span></td>
                    <td className="td-code">{l.codigo_lote || `#${l.id}`}</td>
                    <td className="text-err">{fmtFechaCorta(l.fecha_vencimiento)} ({Math.abs(l.dias_restantes)} días)</td>
                    <td className="text-right">{l.cantidad_disponible}</td>
                    {esAdmin && <td className="text-right"><button type="button" className="btn btn-danger btn-sm" onClick={() => alDarDeBaja(l)}>Dar de baja</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="grid-2 mb-24">
        <section className="panel">
          <div className="panel-header">
            <span className="panel-title">Próximos a vencer</span>
            <select className="hf-select" value={dias} onChange={(e) => setDias(Number(e.target.value))} aria-label="Ventana de días">
              {[3, 7, 15, 30].map((d) => <option key={d} value={d}>{d} días</option>)}
            </select>
          </div>
          {porVencer.length === 0 ? <Vacio titulo="Sin lotes por vencer" icono="inventario" /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Producto</th><th>Vence</th><th className="text-right">Disp.</th></tr></thead>
                <tbody>
                  {porVencer.map((l) => (
                    <tr key={l.id}>
                      <td><div className="td-bold">{l.nombre}</div><div className="td-code">{l.codigo_lote || `Lote #${l.id}`}</div></td>
                      <td><span className={`badge ${l.dias_restantes <= 3 ? 'badge-err' : 'badge-warn'}`}>{l.dias_restantes === 0 ? 'Hoy' : `${l.dias_restantes} días`}</span></td>
                      <td className="text-right">{l.cantidad_disponible}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="panel">
          <div className="panel-header"><span className="panel-title">Bajo stock</span></div>
          {bajo.length === 0 ? <Vacio titulo="Todo sobre el mínimo" icono="inventario" /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Producto</th><th className="text-right">Stock</th><th className="text-right">Mínimo</th></tr></thead>
                <tbody>
                  {bajo.map((p) => (
                    <tr key={p.id} className="tr-warn">
                      <td><div className="td-bold">{p.nombre}</div><div className="td-code">{p.codigo} · {p.categoria}</div></td>
                      <td className="text-right text-err fw-600">{p.stock}</td>
                      <td className="text-right td-muted">{p.stock_minimo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Lotes({ version }) {
  const [pagina, setPagina] = useState(1);
  const l = useApi((cfg) => inventarioApi.lotes({ pagina, limite: 15 }, cfg), [pagina, version]);
  if (l.error) return <ErrorCarga error={l.error} alReintentar={l.recargar} />;
  if (!l.datos) return <Cargando lento={l.lento} />;
  const hoy = hoyISO();
  return (
    <section className="panel">
      <div className="table-wrap">
        <table>
          <thead><tr><th>Lote</th><th>Producto</th><th>Proveedor</th><th>Ingreso</th><th>Vence</th><th className="text-right">Inicial</th><th className="text-right">Disponible</th><th className="text-right">Costo</th></tr></thead>
          <tbody>
            {l.datos.datos.map((x) => (
              <tr key={x.id}>
                <td className="td-code">{x.codigo_lote || `#${x.id}`}</td>
                <td className="td-bold">{x.producto}</td>
                <td className="td-muted">{x.proveedor || '—'}</td>
                <td className="td-muted">{fmtFechaCorta(x.fecha_ingreso)}</td>
                <td className={x.fecha_vencimiento && x.fecha_vencimiento < hoy ? 'text-err' : ''}>{x.fecha_vencimiento ? fmtFechaCorta(x.fecha_vencimiento) : '—'}</td>
                <td className="text-right td-muted">{x.cantidad_inicial}</td>
                <td className="text-right fw-600">{x.cantidad_disponible}</td>
                <td className="text-right td-muted">{fmtMoneda(x.costo_unitario)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginacion meta={l.datos.meta} alCambiar={setPagina} etiqueta="lotes" />
    </section>
  );
}

function Movimientos({ version }) {
  const [pagina, setPagina] = useState(1);
  const [tipo, setTipo] = useState('');
  const m = useApi((cfg) => inventarioApi.movimientos({ pagina, limite: 15, tipo: tipo || undefined }, cfg), [pagina, tipo, version]);
  return (
    <section className="panel">
      <div className="filter-bar">
        <span className="panel-title">Kardex de inventario</span>
        <select className="hf-select" value={tipo} onChange={(e) => { setTipo(e.target.value); setPagina(1); }} aria-label="Tipo de movimiento">
          <option value="">Todos los tipos</option>
          {Object.entries(TIPOS).map(([k, [, t]]) => <option key={k} value={k}>{t}</option>)}
        </select>
      </div>
      {m.error && <ErrorCarga error={m.error} alReintentar={m.recargar} />}
      {!m.datos && !m.error && <Cargando lento={m.lento} />}
      {m.datos && (
        <>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th className="text-right">Cantidad</th><th>Detalle</th><th>Usuario</th></tr></thead>
              <tbody>
                {m.datos.datos.map((x) => (
                  <tr key={x.id}>
                    <td className="td-muted">{fmtFechaCorta(x.fecha)}</td>
                    <td><span className={`badge ${TIPOS[x.tipo][0]}`}>{TIPOS[x.tipo][1]}</span></td>
                    <td className="td-bold">{x.producto}</td>
                    <td className={`text-right fw-600 ${x.cantidad < 0 ? 'text-err' : 'text-ok'}`}>{x.cantidad > 0 ? `+${x.cantidad}` : x.cantidad}</td>
                    <td className="td-muted">{x.consecutivo || x.motivo || '—'}</td>
                    <td className="td-muted">{x.usuario || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginacion meta={m.datos.meta} alCambiar={setPagina} etiqueta="movimientos" />
        </>
      )}
    </section>
  );
}

function useProductosActivos() {
  return useApi((cfg) => productosApi.listar({ limite: 100, orden: 'nombre' }, cfg), []);
}

function ModalEntrada({ alCerrar, alGuardar }) {
  const toast = useToast();
  const productos = useProductosActivos();
  const proveedores = useApi((cfg) => catalogoApi.proveedores({ limite: 100 }, cfg), []);
  const [f, setF] = useState({ producto_id: '', proveedor_id: '', cantidad: '', costo_unitario: '', fecha_vencimiento: '', codigo_lote: '' });
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const cambiar = (e) => setF((x) => ({ ...x, [e.target.name]: e.target.value }));

  const elegirProducto = (e) => {
    const p = productos.datos?.datos.find((x) => String(x.id) === e.target.value);
    setF((x) => ({ ...x, producto_id: e.target.value, proveedor_id: p?.proveedor_id ? String(p.proveedor_id) : '', costo_unitario: p ? String(p.precio_compra) : '' }));
  };

  const guardar = async () => {
    const er = {};
    if (!f.producto_id) er.producto_id = 'Seleccione un producto';
    if (!(Number(f.cantidad) > 0)) er.cantidad = 'Debe ser mayor que cero';
    if (f.fecha_vencimiento && f.fecha_vencimiento < hoyISO()) er.fecha_vencimiento = 'La fecha ya pasó';
    setErrores(er);
    if (Object.keys(er).length) return;
    setEnviando(true);
    try {
      await inventarioApi.entrada({
        producto_id: Number(f.producto_id), proveedor_id: f.proveedor_id ? Number(f.proveedor_id) : null, cantidad: Number(f.cantidad),
        costo_unitario: f.costo_unitario ? Number(f.costo_unitario) : undefined, fecha_vencimiento: f.fecha_vencimiento || null, codigo_lote: f.codigo_lote || null,
      });
      toast.exito('Entrada registrada: se creó un nuevo lote');
      alGuardar();
    } catch (e) {
      setErrores(e.porCampo);
      toast.error(e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal abierto titulo="Registrar entrada de mercancía" alCerrar={alCerrar}
      pie={<><button type="button" className="btn btn-outline" onClick={alCerrar}>Cancelar</button><button type="button" className="btn btn-primary" onClick={guardar} disabled={enviando}>{enviando ? 'Guardando…' : 'Registrar entrada'}</button></>}>
      <Campo etiqueta="Producto *" id="e-prod" error={errores.producto_id}>
        <select className="form-select" id="e-prod" name="producto_id" value={f.producto_id} onChange={elegirProducto}>
          <option value="">— Seleccione —</option>
          {productos.datos?.datos.map((p) => <option key={p.id} value={p.id}>{p.nombre} ({p.codigo}) · stock {p.stock}</option>)}
        </select>
      </Campo>
      <div className="form-row form-row-2">
        <Campo etiqueta="Cantidad *" id="e-cant" error={errores.cantidad}>
          <input className="form-input" id="e-cant" name="cantidad" type="number" min="1" value={f.cantidad} onChange={cambiar} />
        </Campo>
        <Campo etiqueta="Costo unitario ($)" id="e-costo">
          <input className="form-input" id="e-costo" name="costo_unitario" type="number" min="0" value={f.costo_unitario} onChange={cambiar} />
        </Campo>
      </div>
      <div className="form-row form-row-2">
        <Campo etiqueta="Fecha de vencimiento" id="e-venc" error={errores.fecha_vencimiento} ayuda="Necesaria para la rotación FEFO">
          <input className="form-input" id="e-venc" name="fecha_vencimiento" type="date" min={hoyISO()} value={f.fecha_vencimiento} onChange={cambiar} />
        </Campo>
        <Campo etiqueta="Código de lote" id="e-lote">
          <input className="form-input" id="e-lote" name="codigo_lote" value={f.codigo_lote} onChange={cambiar} placeholder="Opcional" />
        </Campo>
      </div>
      <Campo etiqueta="Proveedor" id="e-prov">
        <select className="form-select" id="e-prov" name="proveedor_id" value={f.proveedor_id} onChange={cambiar}>
          <option value="">— Sin proveedor —</option>
          {proveedores.datos?.datos.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
        </select>
      </Campo>
    </Modal>
  );
}

function ModalAjuste({ inicial, alCerrar, alGuardar }) {
  const toast = useToast();
  const productos = useProductosActivos();
  const [f, setF] = useState({ producto_id: '', lote_id: '', cantidad: '', motivo: 'merma', sentido: 'salida', observacion: '', ...inicial });
  const lotes = useApi((cfg) => (f.producto_id ? productosApi.obtener(f.producto_id, cfg) : Promise.resolve(null)), [f.producto_id]);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const cambiar = (e) => setF((x) => ({ ...x, [e.target.name]: e.target.value }));

  const guardar = async () => {
    const er = {};
    if (!f.producto_id) er.producto_id = 'Seleccione un producto';
    if (!(Number(f.cantidad) > 0)) er.cantidad = 'Debe ser mayor que cero';
    if (f.sentido === 'entrada' && !f.lote_id) er.lote_id = 'Para sumar unidades indique el lote';
    setErrores(er);
    if (Object.keys(er).length) return;
    setEnviando(true);
    try {
      const r = await inventarioApi.ajuste({
        producto_id: Number(f.producto_id), lote_id: f.lote_id ? Number(f.lote_id) : null,
        cantidad: (f.sentido === 'salida' ? -1 : 1) * Number(f.cantidad), motivo: f.motivo, observacion: f.observacion || null,
      });
      toast.exito(`Ajuste aplicado. Nuevo stock: ${r.stock}`);
      alGuardar();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal abierto titulo="Ajuste de inventario" alCerrar={alCerrar}
      pie={<><button type="button" className="btn btn-outline" onClick={alCerrar}>Cancelar</button><button type="button" className="btn btn-primary" onClick={guardar} disabled={enviando}>{enviando ? 'Aplicando…' : 'Aplicar ajuste'}</button></>}>
      <Campo etiqueta="Producto *" id="a-prod" error={errores.producto_id}>
        <select className="form-select" id="a-prod" name="producto_id" value={f.producto_id} onChange={(e) => setF((x) => ({ ...x, producto_id: e.target.value, lote_id: '' }))}>
          <option value="">— Seleccione —</option>
          {productos.datos?.datos.map((p) => <option key={p.id} value={p.id}>{p.nombre} ({p.codigo}) · stock {p.stock}</option>)}
        </select>
      </Campo>
      <div className="form-row form-row-2">
        <Campo etiqueta="Tipo" id="a-sent">
          <select className="form-select" id="a-sent" name="sentido" value={f.sentido} onChange={cambiar}>
            <option value="salida">Salida (resta)</option>
            <option value="entrada">Corrección (suma)</option>
          </select>
        </Campo>
        <Campo etiqueta="Cantidad *" id="a-cant" error={errores.cantidad}>
          <input className="form-input" id="a-cant" name="cantidad" type="number" min="1" value={f.cantidad} onChange={cambiar} />
        </Campo>
      </div>
      <div className="form-row form-row-2">
        <Campo etiqueta="Motivo *" id="a-mot">
          <select className="form-select" id="a-mot" name="motivo" value={f.motivo} onChange={cambiar}>
            {[['merma', 'Merma'], ['vencimiento', 'Vencimiento'], ['averia', 'Avería'], ['conteo', 'Conteo físico'], ['otro', 'Otro']].map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </Campo>
        <Campo etiqueta={f.sentido === 'entrada' ? 'Lote *' : 'Lote'} id="a-lote" error={errores.lote_id} ayuda={f.sentido === 'salida' && !f.lote_id ? 'Sin lote: se descuenta en orden FEFO' : undefined}>
          <select className="form-select" id="a-lote" name="lote_id" value={f.lote_id} onChange={cambiar} disabled={!f.producto_id}>
            <option value="">{f.sentido === 'salida' ? 'Automático (FEFO)' : '— Seleccione —'}</option>
            {lotes.datos?.lotes.map((l) => <option key={l.id} value={l.id}>{l.codigo_lote || `#${l.id}`} · {l.cantidad_disponible} und · vence {l.fecha_vencimiento || 's/f'}</option>)}
          </select>
        </Campo>
      </div>
      <Campo etiqueta="Observación" id="a-obs">
        <input className="form-input" id="a-obs" name="observacion" value={f.observacion} onChange={cambiar} maxLength={150} placeholder="Ej: empaque dañado en refrigerador" />
      </Campo>
    </Modal>
  );
}
