/**
 * Punto de venta. El carrito se maneja con useReducer (utils/carrito.js):
 * todas las modificaciones pasan por acciones, lo que hace el estado predecible y fácil de probar.
 */
import { useMemo, useReducer, useState } from 'react';
import { Link } from 'react-router-dom';
import useApi from '../hooks/useApi';
import { catalogoApi, clientesApi, productosApi, ventasApi } from '../api/servicios';
import { useToast } from '../context/ToastContext';
import { CajaBusqueda, Cargando, EncabezadoPagina, ErrorCarga, Modal, PuntoCategoria, Vacio } from '../components/Comunes';
import Icono from '../components/Icono';
import { carritoInicial, carritoReducer, totalCarrito, unidadesCarrito } from '../utils/carrito';
import { fmtMoneda, MEDIOS_PAGO } from '../utils/formato';
import FormCliente from '../components/FormCliente';

export default function NuevaVenta() {
  const toast = useToast();
  const [carrito, dispatch] = useReducer(carritoReducer, carritoInicial);
  const [buscar, setBuscar] = useState('');
  const [categoria, setCategoria] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [recibo, setRecibo] = useState(null);
  const [nuevoCliente, setNuevoCliente] = useState(false);
  const [errorVenta, setErrorVenta] = useState(null);

  const productos = useApi((cfg) => productosApi.listar({ limite: 100, orden: 'nombre' }, cfg), []);
  const categorias = useApi((cfg) => catalogoApi.categorias(cfg), []);
  const clientes = useApi((cfg) => clientesApi.listar({ limite: 100 }, cfg), []);

  // Filtrado en memoria (los productos ya están cargados): respuesta inmediata al escribir.
  const visibles = useMemo(() => {
    const t = buscar.trim().toLowerCase();
    return (productos.datos?.datos || []).filter((p) => (!categoria || p.categoria_id === categoria)
      && (!t || p.nombre.toLowerCase().includes(t) || p.codigo.toLowerCase().includes(t)));
  }, [productos.datos, buscar, categoria]);

  const total = totalCarrito(carrito.items);
  const unidades = unidadesCarrito(carrito.items);
  const esCredito = carrito.medio_pago === 'credito';
  const enCarrito = useMemo(() => new Map(carrito.items.map((i) => [i.producto_id, i.cantidad])), [carrito.items]);

  const agregar = (p) => {
    if (p.stock <= 0) return toast.error(`${p.nombre} no tiene existencias`);
    if ((enCarrito.get(p.id) || 0) >= p.stock) return toast.info(`Solo hay ${p.stock} unidades de ${p.nombre}`);
    dispatch({ type: 'agregar', producto: p });
    return undefined;
  };

  const validarVenta = () => {
    if (!carrito.items.length) return 'Agregue al menos un producto';
    if (esCredito && !carrito.cliente) return 'Las ventas a crédito requieren seleccionar un cliente';
    if (esCredito && carrito.abono_inicial >= total) return 'El abono inicial debe ser menor que el total';
    return null;
  };

  const cobrar = async () => {
    setEnviando(true);
    setErrorVenta(null);
    try {
      const venta = await ventasApi.crear({
        cliente_id: carrito.cliente?.id || null,
        medio_pago: carrito.medio_pago,
        abono_inicial: esCredito ? carrito.abono_inicial : undefined,
        observacion: carrito.observacion || null,
        items: carrito.items.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad })),
      });
      setConfirmando(false);
      setRecibo(venta);
      dispatch({ type: 'limpiar' });
      productos.recargar();
      toast.exito(`Venta ${venta.consecutivo} registrada`);
    } catch (e) {
      // Si falta stock, la API indica exactamente qué producto y cuántas unidades hay.
      setErrorVenta(e);
      if (e.codigo === 'STOCK_INSUFICIENTE') productos.recargar();
    } finally {
      setEnviando(false);
    }
  };

  const abrirConfirmacion = () => {
    const error = validarVenta();
    if (error) return toast.error(error);
    setErrorVenta(null);
    setConfirmando(true);
    return undefined;
  };

  return (
    <>
      <EncabezadoPagina titulo="Realizar venta" subtitulo="Seleccione productos, cliente y medio de pago">
        <Link to="/ventas" className="btn btn-outline btn-sm"><Icono nombre="historial" tam={13} /> Historial</Link>
      </EncabezadoPagina>

      <div className="pos">
        <section className="panel pos-catalogo" aria-label="Catálogo de productos">
          <div className="filter-bar">
            <CajaBusqueda valor={buscar} alCambiar={setBuscar} placeholder="Buscar producto o código…" ancho="100%" />
          </div>
          <div className="filter-tabs pos-cats" role="tablist">
            <button type="button" className={`filter-tab${!categoria ? ' active' : ''}`} onClick={() => setCategoria(null)}>Todos</button>
            {categorias.datos?.map((c) => (
              <button key={c.id} type="button" className={`filter-tab${categoria === c.id ? ' active' : ''}`} onClick={() => setCategoria(c.id)}>{c.icono} {c.nombre}</button>
            ))}
          </div>
          {productos.error && <ErrorCarga error={productos.error} alReintentar={productos.recargar} />}
          {!productos.datos && !productos.error && <Cargando lento={productos.lento} />}
          {productos.datos && visibles.length === 0 && <Vacio titulo="Sin coincidencias" texto="Pruebe con otro nombre o código." />}
          <div className="pos-grid">
            {visibles.map((p) => {
              const usado = enCarrito.get(p.id) || 0;
              const agotado = p.stock - usado <= 0;
              return (
                <button key={p.id} type="button" className={`pos-card${agotado ? ' agotado' : ''}${usado ? ' en-carrito' : ''}`} onClick={() => agregar(p)} disabled={p.stock <= 0}>
                  <span className="pos-card-cat"><PuntoCategoria categoria={p.categoria} />{p.codigo}</span>
                  <span className="pos-card-nombre">{p.nombre}</span>
                  <span className="pos-card-pres">{p.presentacion}</span>
                  <span className="pos-card-pie">
                    <strong>{fmtMoneda(p.precio_venta)}</strong>
                    <span className={p.bajo_stock ? 'text-err' : 'td-muted'}>{p.stock - usado} disp.</span>
                  </span>
                  {usado > 0 && <span className="pos-card-badge">{usado}</span>}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="panel pos-carrito" aria-label="Carrito">
          <div className="panel-header">
            <span className="panel-title">Venta actual</span>
            {carrito.items.length > 0 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'limpiar' })}>Vaciar</button>}
          </div>

          <div className="panel-body">
            <label className="form-label" htmlFor="v-cliente">Cliente</label>
            <div className="fila-cliente">
              <select id="v-cliente" className="form-select" value={carrito.cliente?.id || ''}
                onChange={(e) => dispatch({ type: 'cliente', cliente: clientes.datos?.datos.find((c) => String(c.id) === e.target.value) || null })}>
                <option value="">Cliente eventual</option>
                {clientes.datos?.datos.map((c) => <option key={c.id} value={c.id}>{c.nombre}{c.saldo ? ` · debe ${fmtMoneda(c.saldo)}` : ''}</option>)}
              </select>
              <button type="button" className="icon-btn" title="Registrar cliente" aria-label="Registrar cliente" onClick={() => setNuevoCliente(true)}><Icono nombre="mas" /></button>
            </div>
          </div>

          <div className="pos-items">
            {carrito.items.length === 0 && <Vacio titulo="Carrito vacío" texto="Toque un producto para agregarlo." icono="venta" />}
            {carrito.items.map((i) => (
              <div key={i.producto_id} className="pos-item">
                <div className="pos-item-info">
                  <div className="td-bold">{i.nombre}</div>
                  <div className="td-muted" style={{ fontSize: 12 }}>{fmtMoneda(i.precio)} · {i.presentacion}</div>
                </div>
                <div className="cantidad">
                  <button type="button" aria-label="Restar uno" onClick={() => (i.cantidad === 1 ? dispatch({ type: 'quitar', id: i.producto_id }) : dispatch({ type: 'cantidad', id: i.producto_id, cantidad: i.cantidad - 1 }))}><Icono nombre="menos" tam={12} grosor={2.4} /></button>
                  <input type="number" min="1" max={i.stock} value={i.cantidad} aria-label={`Cantidad de ${i.nombre}`} onChange={(e) => dispatch({ type: 'cantidad', id: i.producto_id, cantidad: e.target.value })} />
                  <button type="button" aria-label="Sumar uno" disabled={i.cantidad >= i.stock} onClick={() => dispatch({ type: 'cantidad', id: i.producto_id, cantidad: i.cantidad + 1 })}><Icono nombre="mas" tam={12} grosor={2.4} /></button>
                </div>
                <div className="pos-item-sub">{fmtMoneda(i.precio * i.cantidad)}</div>
                <button type="button" className="icon-btn danger" aria-label={`Quitar ${i.nombre}`} onClick={() => dispatch({ type: 'quitar', id: i.producto_id })}><Icono nombre="cerrar" tam={12} /></button>
              </div>
            ))}
          </div>

          <div className="panel-body pos-pago">
            <span className="form-label">Medio de pago</span>
            <div className="medios" role="radiogroup" aria-label="Medio de pago">
              {Object.entries(MEDIOS_PAGO).map(([k, t]) => (
                <button key={k} type="button" role="radio" aria-checked={carrito.medio_pago === k} className={`st-btn${carrito.medio_pago === k ? ' active' : ''}`}
                  onClick={() => dispatch({ type: 'medio', medio: k })} disabled={k === 'credito' && !carrito.cliente}
                  title={k === 'credito' && !carrito.cliente ? 'Seleccione un cliente para vender a crédito' : undefined}>{t}</button>
              ))}
            </div>
            {esCredito && (
              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="form-label" htmlFor="v-abono">Abono inicial (opcional)</label>
                <input id="v-abono" className="form-input" type="number" min="0" step="100" value={carrito.abono_inicial || ''} onChange={(e) => dispatch({ type: 'abono', valor: e.target.value })} />
                <p className="form-hint">Saldo que quedará pendiente: {fmtMoneda(Math.max(0, total - carrito.abono_inicial))}</p>
              </div>
            )}
          </div>

          <div className="pos-total">
            <div><span>{unidades} unidades</span><strong>{fmtMoneda(total)}</strong></div>
            <button type="button" className="btn btn-primary btn-lg btn-block" onClick={abrirConfirmacion} disabled={!carrito.items.length}>
              Cobrar {total ? fmtMoneda(total) : ''}
            </button>
          </div>
        </aside>
      </div>

      <Modal abierto={confirmando} titulo="Confirmar venta" alCerrar={() => !enviando && setConfirmando(false)}
        pie={<><button type="button" className="btn btn-outline" onClick={() => setConfirmando(false)} disabled={enviando}>Volver</button><button type="button" className="btn btn-primary" onClick={cobrar} disabled={enviando}>{enviando ? 'Registrando…' : 'Confirmar venta'}</button></>}>
        <ResumenVenta items={carrito.items} total={total} cliente={carrito.cliente?.nombre} medio={carrito.medio_pago} abono={carrito.abono_inicial} />
        {errorVenta && (
          <div className="alerta-error" role="alert">
            <strong>{errorVenta.message}</strong>
            {errorVenta.codigo === 'STOCK_INSUFICIENTE' && (
              <ul>{errorVenta.detalles.map((d) => <li key={d.producto_id}>{d.producto}: solicitó {d.solicitado}, hay {d.disponible} vigentes</li>)}</ul>
            )}
          </div>
        )}
      </Modal>

      <Modal abierto={Boolean(recibo)} titulo={`Venta ${recibo?.consecutivo || ''} registrada`} alCerrar={() => setRecibo(null)}
        pie={<><button type="button" className="btn btn-outline" onClick={() => window.print()}><Icono nombre="imprimir" tam={14} /> Imprimir recibo</button><button type="button" className="btn btn-primary" onClick={() => setRecibo(null)}>Nueva venta</button></>}>
        {recibo && (
          <div className="recibo">
            <div className="recibo-encabezado">
              <strong>Salsamentaria MYK</strong><span>Neiva, Huila</span>
              <span>{recibo.consecutivo} · {recibo.fecha} {recibo.hora}</span>
              <span>Atendió: {recibo.vendedor}</span>
            </div>
            <ResumenVenta items={recibo.items.map((i) => ({ producto_id: i.producto_id, nombre: i.producto, cantidad: i.cantidad, precio: i.precio_unitario }))}
              total={recibo.total} cliente={recibo.cliente} medio={recibo.medio_pago} abono={recibo.total - recibo.saldo} saldo={recibo.saldo} />
          </div>
        )}
      </Modal>

      {nuevoCliente && (
        <Modal abierto titulo="Registrar cliente" alCerrar={() => setNuevoCliente(false)}>
          <FormCliente alCancelar={() => setNuevoCliente(false)} alGuardar={(c) => {
            setNuevoCliente(false);
            clientes.setDatos((d) => ({ ...d, datos: [...(d?.datos || []), c].sort((a, b) => a.nombre.localeCompare(b.nombre)) }));
            dispatch({ type: 'cliente', cliente: c });
          }} />
        </Modal>
      )}
    </>
  );
}

function ResumenVenta({ items, total, cliente, medio, abono, saldo }) {
  return (
    <>
      <table className="tabla-resumen">
        <tbody>
          {items.map((i) => (
            <tr key={i.producto_id}><td>{i.cantidad} × {i.nombre}</td><td className="text-right">{fmtMoneda(i.precio * i.cantidad)}</td></tr>
          ))}
        </tbody>
        <tfoot>
          <tr><th>Total</th><th className="text-right">{fmtMoneda(total)}</th></tr>
        </tfoot>
      </table>
      <p className="resumen-linea">Cliente: <strong>{cliente || 'Cliente eventual'}</strong> · Pago: <strong>{MEDIOS_PAGO[medio]}</strong></p>
      {medio === 'credito' && <p className="resumen-linea">Abono: <strong>{fmtMoneda(abono || 0)}</strong> · Saldo pendiente: <strong>{fmtMoneda(saldo ?? total - (abono || 0))}</strong></p>}
    </>
  );
}
