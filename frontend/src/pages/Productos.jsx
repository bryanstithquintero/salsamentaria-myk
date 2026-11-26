import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useApi from '../hooks/useApi';
import useDebounce from '../hooks/useDebounce';
import { catalogoApi, productosApi } from '../api/servicios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  CajaBusqueda, Cargando, EncabezadoPagina, ErrorCarga, Insignia, Modal, Paginacion, PuntoCategoria, Vacio,
} from '../components/Comunes';
import Icono from '../components/Icono';
import { diasHasta, fmtMoneda } from '../utils/formato';
import { filasAProductos, parsearCsv } from '../utils/csv';

const ORDENES = [
  ['stock-asc', 'Existencias ↑'], ['stock-desc', 'Existencias ↓'], ['nombre-asc', 'Nombre A–Z'],
  ['precio-desc', 'Precio mayor'], ['precio-asc', 'Precio menor'], ['codigo-asc', 'Código'],
];

export default function Productos() {
  const { esAdmin } = useAuth();
  const toast = useToast();
  const navegar = useNavigate();
  const [buscar, setBuscar] = useState('');
  const [categoria, setCategoria] = useState(null);
  const [soloBajo, setSoloBajo] = useState(false);
  const [orden, setOrden] = useState('stock-asc');
  const [pagina, setPagina] = useState(1);
  const [aDesactivar, setADesactivar] = useState(null);
  const [importando, setImportando] = useState(false);
  const termino = useDebounce(buscar);

  const [campoOrden, dir] = orden.split('-');
  const params = useMemo(() => ({
    buscar: termino || undefined, categoria_id: categoria || undefined, estado: soloBajo ? 'bajo' : undefined,
    orden: campoOrden, dir, pagina, limite: 10,
  }), [termino, categoria, soloBajo, campoOrden, dir, pagina]);

  const categorias = useApi((cfg) => catalogoApi.categorias(cfg), []);
  const lista = useApi((cfg) => productosApi.listar(params, cfg), [params]);
  const porCategoria = lista.datos?.meta.porCategoria || {};
  const totalSinCategoria = Object.values(porCategoria).reduce((a, b) => a + b, 0);

  const filtrar = (fn) => (v) => { fn(v); setPagina(1); };

  const desactivar = async () => {
    try {
      await productosApi.desactivar(aDesactivar.id);
      toast.exito(`"${aDesactivar.nombre}" se desactivó del catálogo`);
      setADesactivar(null);
      lista.recargar();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const exportar = async () => {
    try {
      await productosApi.exportar({ buscar: termino || undefined, categoria_id: categoria || undefined, estado: soloBajo ? 'bajo' : undefined });
      toast.exito('Inventario exportado a CSV');
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <>
      <EncabezadoPagina titulo="Productos" subtitulo={lista.datos ? `${lista.datos.meta.total} referencias${soloBajo ? ' con bajo stock' : ''}` : 'Catálogo e inventario'}>
        <CajaBusqueda valor={buscar} alCambiar={filtrar(setBuscar)} placeholder="Buscar por nombre o código…" />
        <button type="button" className="btn btn-outline btn-sm" onClick={exportar}><Icono nombre="descargar" tam={13} grosor={2} /> Exportar CSV</button>
        {esAdmin && <button type="button" className="btn btn-outline btn-sm" onClick={() => setImportando(true)}><Icono nombre="subir" tam={13} grosor={2} /> Importar</button>}
        {esAdmin && <Link to="/productos/nuevo" className="btn btn-primary btn-sm"><Icono nombre="mas" tam={13} grosor={2.2} /> Nuevo producto</Link>}
      </EncabezadoPagina>

      <div className="panel">
        <div className="filter-bar">
          <div className="filter-tabs" role="tablist" aria-label="Categorías">
            <button type="button" role="tab" aria-selected={!categoria} className={`filter-tab${!categoria ? ' active' : ''}`} onClick={() => filtrar(setCategoria)(null)}>
              Todos <span className="ftab-count">{totalSinCategoria}</span>
            </button>
            {categorias.datos?.map((c) => (
              <button key={c.id} type="button" role="tab" aria-selected={categoria === c.id} className={`filter-tab${categoria === c.id ? ' active' : ''}`} onClick={() => filtrar(setCategoria)(c.id)}>
                {c.icono} {c.nombre} <span className="ftab-count">{porCategoria[c.id] || 0}</span>
              </button>
            ))}
          </div>
          <div className="filtros-derecha">
            <label className="check-label"><input type="checkbox" checked={soloBajo} onChange={(e) => filtrar(setSoloBajo)(e.target.checked)} /> Solo bajo stock</label>
            <label className="hf-label" htmlFor="orden">Ordenar</label>
            <select id="orden" className="hf-select" value={orden} onChange={(e) => filtrar(setOrden)(e.target.value)}>
              {ORDENES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </div>
        </div>

        {lista.error && <ErrorCarga error={lista.error} alReintentar={lista.recargar} />}
        {lista.cargando && !lista.datos && <Cargando filas={8} lento={lista.lento} />}
        {lista.datos && lista.datos.datos.length === 0 && (
          <Vacio titulo="No hay productos" texto={termino ? `Ningún producto coincide con "${termino}".` : 'No hay productos con estos filtros.'} />
        )}
        {lista.datos && lista.datos.datos.length > 0 && (
          <div className={`table-wrap${lista.cargando ? ' actualizando' : ''}`}>
            <table>
              <thead>
                <tr>
                  <th>Código</th><th>Producto</th><th>Presentación</th><th className="text-right">Existencias</th>
                  <th className="text-right">P. compra</th><th className="text-right">P. venta</th><th>Vence</th><th>Estado</th>
                  {esAdmin && <th><span className="sr-only">Acciones</span></th>}
                </tr>
              </thead>
              <tbody>
                {lista.datos.datos.map((p) => {
                  const dias = diasHasta(p.proximo_vencimiento);
                  return (
                    <tr key={p.id} className={p.bajo_stock ? 'tr-warn' : ''}>
                      <td className="td-code">{p.codigo}</td>
                      <td>
                        <div className="td-bold"><PuntoCategoria categoria={p.categoria} />{p.nombre}</div>
                        <div className="td-muted" style={{ fontSize: 11.5 }}>{p.categoria}</div>
                      </td>
                      <td className="td-muted">{p.presentacion}</td>
                      <td className="text-right"><strong style={{ color: p.bajo_stock ? 'var(--err)' : undefined }}>{p.stock}</strong> <span className="td-muted">{p.unidad === 'libra' ? 'lb' : 'und'}</span></td>
                      <td className="text-right td-muted">{fmtMoneda(p.precio_compra)}</td>
                      <td className="text-right td-price">{fmtMoneda(p.precio_venta)}</td>
                      <td className="td-muted">
                        {dias === null ? '—' : dias < 0 ? <span className="text-err">Vencido</span> : dias <= 7 ? <span className="text-warn">{dias === 0 ? 'Hoy' : `${dias} días`}</span> : `${dias} días`}
                      </td>
                      <td><Insignia estado={p.bajo_stock ? 'bajo' : 'ok'} /></td>
                      {esAdmin && (
                        <td className="acciones">
                          <button type="button" className="icon-btn" title="Editar" aria-label={`Editar ${p.nombre}`} onClick={() => navegar(`/productos/${p.id}/editar`)}><Icono nombre="editar" tam={13} /></button>
                          <button type="button" className="icon-btn danger" title="Desactivar" aria-label={`Desactivar ${p.nombre}`} onClick={() => setADesactivar(p)}><Icono nombre="eliminar" tam={13} /></button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Paginacion meta={lista.datos?.meta} alCambiar={setPagina} etiqueta="productos" />
      </div>

      <Modal abierto={Boolean(aDesactivar)} titulo="Desactivar producto" alCerrar={() => setADesactivar(null)}
        pie={<><button type="button" className="btn btn-outline" onClick={() => setADesactivar(null)}>Cancelar</button><button type="button" className="btn btn-danger" onClick={desactivar}>Desactivar</button></>}>
        <p>¿Desactivar <strong>{aDesactivar?.nombre}</strong> ({aDesactivar?.codigo})?</p>
        <p className="text-muted" style={{ fontSize: 13, marginTop: 8 }}>No se elimina: deja de aparecer en el catálogo y en el punto de venta, pero su historial se conserva.</p>
      </Modal>

      {importando && <ModalImportar alCerrar={() => setImportando(false)} alTerminar={() => { setImportando(false); lista.recargar(); categorias.recargar(); }} />}
    </>
  );
}

function ModalImportar({ alCerrar, alTerminar }) {
  const toast = useToast();
  const [filas, setFilas] = useState([]);
  const [archivo, setArchivo] = useState('');
  const [resultado, setResultado] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const leer = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setArchivo(f.name);
    setResultado(null);
    const lector = new FileReader();
    lector.onload = () => setFilas(filasAProductos(parsearCsv(String(lector.result))));
    lector.readAsText(f, 'utf-8');
  };

  const importar = async () => {
    setEnviando(true);
    try {
      const r = await productosApi.importar(filas);
      setResultado(r);
      if (r.creados) toast.exito(`${r.creados} productos importados`);
      if (!r.errores.length) alTerminar();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const plantilla = () => {
    const csv = '﻿codigo;nombre;categoria;presentacion;unidad;precio_compra;margen;stock_minimo;stock_inicial;fecha_vencimiento\r\nCHO-020;Chorizo de ternera;Cárnicos;Paquete x 500 g;paquete;4800;35;5;12;2026-12-30\r\n';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'plantilla-productos.csv';
    a.click();
  };

  return (
    <Modal abierto titulo="Importar productos desde CSV" alCerrar={alCerrar} ancho={620}
      pie={<><button type="button" className="btn btn-outline" onClick={alCerrar}>Cerrar</button><button type="button" className="btn btn-primary" disabled={!filas.length || enviando} onClick={importar}>{enviando ? 'Importando…' : `Importar ${filas.length || ''} filas`}</button></>}>
      <p style={{ fontSize: 13 }}>Columnas: <code>codigo; nombre; categoria; presentacion; unidad; precio_compra; margen; stock_minimo; stock_inicial; fecha_vencimiento</code>.</p>
      <button type="button" className="btn btn-ghost btn-sm" style={{ margin: '8px 0 14px' }} onClick={plantilla}><Icono nombre="descargar" tam={13} /> Descargar plantilla</button>
      <label className="zona-archivo">
        <input type="file" accept=".csv,text/csv" onChange={leer} />
        <Icono nombre="subir" tam={22} />
        <span>{archivo || 'Seleccione un archivo .csv'}</span>
      </label>
      {filas.length > 0 && !resultado && <p className="form-hint">Se leyeron {filas.length} filas. Revise y presione Importar.</p>}
      {resultado && (
        <div style={{ marginTop: 14 }}>
          <p><strong>{resultado.creados}</strong> creados · <strong>{resultado.errores.length}</strong> con error</p>
          {resultado.errores.length > 0 && (
            <ul className="lista-errores">
              {resultado.errores.map((e) => <li key={`${e.fila}-${e.codigo}`}>Fila {e.fila} ({e.codigo || 'sin código'}): {e.mensaje}</li>)}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}
