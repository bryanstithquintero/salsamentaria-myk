/** Componentes reutilizables de presentación. */
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icono from './Icono';

export function EncabezadoPagina({ titulo, subtitulo, children, migas }) {
  return (
    <>
      {migas}
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">{titulo}</h1>
          {subtitulo && <p className="page-subtitle">{subtitulo}</p>}
        </div>
        {children && <div className="page-actions">{children}</div>}
      </div>
    </>
  );
}

const ESTADOS = {
  pagada: ['badge-ok', 'Pagada'],
  pendiente: ['badge-warn', 'Pendiente'],
  anulada: ['badge-muted', 'Anulada'],
  bajo: ['badge-err', 'Bajo stock'],
  ok: ['badge-ok', 'Disponible'],
  activo: ['badge-ok', 'Activo'],
  inactivo: ['badge-muted', 'Inactivo'],
  admin: ['badge-accent', 'Administrador'],
  vendedor: ['badge-info', 'Vendedor'],
};

export function Insignia({ estado, children }) {
  const [clase, texto] = ESTADOS[estado] || ['badge-muted', estado];
  return <span className={`badge ${clase}`}>{children || texto}</span>;
}

export function PuntoCategoria({ categoria }) {
  const clase = categoria === 'Cárnicos' ? 'cat-carnico' : categoria === 'Lácteos' ? 'cat-lacteo' : 'cat-otro';
  return <span className={`cat-dot ${clase}`} aria-hidden="true" />;
}

export function Cargando({ filas = 5, lento = false }) {
  return (
    <div className="skeleton-wrap" aria-busy="true" aria-label="Cargando">
      {lento && (
        <p className="aviso-lento">
          Conectando con el servidor… la primera carga puede tardar hasta un minuto mientras el servicio se activa.
        </p>
      )}
      {Array.from({ length: filas }, (_, i) => <div key={i} className="skeleton-row" />)}
    </div>
  );
}

export function Vacio({ titulo = 'Sin resultados', texto, icono = 'buscar', children }) {
  return (
    <div className="empty-state">
      <Icono nombre={icono} tam={40} />
      <h3>{titulo}</h3>
      {texto && <p>{texto}</p>}
      {children && <div style={{ marginTop: 14 }}>{children}</div>}
    </div>
  );
}

export function ErrorCarga({ error, alReintentar }) {
  return (
    <div className="empty-state" role="alert">
      <Icono nombre="alerta" tam={40} />
      <h3>No fue posible cargar la información</h3>
      <p>{error?.message}</p>
      {alReintentar && <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 14 }} onClick={alReintentar}>Reintentar</button>}
    </div>
  );
}

export function Paginacion({ meta, alCambiar, etiqueta = 'registros' }) {
  if (!meta || meta.total === 0) return null;
  const { pagina, paginas, total, limite } = meta;
  const desde = (pagina - 1) * limite + 1;
  const hasta = Math.min(pagina * limite, total);
  const numeros = [];
  for (let n = Math.max(1, pagina - 2); n <= Math.min(paginas, pagina + 2); n += 1) numeros.push(n);
  return (
    <div className="pagination">
      <span className="pg-info">Mostrando {desde}–{hasta} de {total} {etiqueta}</span>
      <div className="pg-btns">
        <button type="button" className="pg-btn" disabled={pagina === 1} onClick={() => alCambiar(pagina - 1)} aria-label="Página anterior">‹</button>
        {numeros.map((n) => (
          <button key={n} type="button" className={`pg-btn${n === pagina ? ' active' : ''}`} onClick={() => alCambiar(n)} aria-current={n === pagina ? 'page' : undefined}>{n}</button>
        ))}
        <button type="button" className="pg-btn" disabled={pagina === paginas} onClick={() => alCambiar(pagina + 1)} aria-label="Página siguiente">›</button>
      </div>
    </div>
  );
}

export function CajaBusqueda({ valor, alCambiar, placeholder = 'Buscar…', ancho }) {
  return (
    <label className="search-box" style={ancho ? { width: ancho } : undefined}>
      <Icono nombre="buscar" tam={14} grosor={2} />
      <input type="search" value={valor} onChange={(e) => alCambiar(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </label>
  );
}

/** Ventana modal accesible: cierra con Escape y con clic en el fondo. */
export function Modal({ abierto, titulo, alCerrar, children, pie, ancho = 520 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!abierto) return undefined;
    const tecla = (e) => e.key === 'Escape' && alCerrar();
    document.addEventListener('keydown', tecla);
    ref.current?.querySelector('input, select, textarea, button')?.focus();
    return () => document.removeEventListener('keydown', tecla);
  }, [abierto, alCerrar]);
  if (!abierto) return null;
  // Se monta en <body> (portal) para quedar por encima de todo y poder imprimirse sola.
  return createPortal(
    <div className="modal-fondo" onMouseDown={(e) => e.target === e.currentTarget && alCerrar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo} style={{ maxWidth: ancho }} ref={ref}>
        <div className="modal-head">
          <h2>{titulo}</h2>
          <button type="button" className="icon-btn" onClick={alCerrar} aria-label="Cerrar"><Icono nombre="cerrar" /></button>
        </div>
        <div className="modal-body">{children}</div>
        {pie && <div className="modal-foot">{pie}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Campo de formulario con etiqueta y mensaje de error. */
export function Campo({ etiqueta, error, ayuda, id, children }) {
  return (
    <div className={`form-group${error ? ' has-error' : ''}`}>
      {etiqueta && <label className="form-label" htmlFor={id}>{etiqueta}</label>}
      {children}
      {error ? <p className="form-error" role="alert">{error}</p> : ayuda && <p className="form-hint">{ayuda}</p>}
    </div>
  );
}

export function TarjetaIndicador({ etiqueta, valor, meta, tono, colorValor }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{etiqueta}</div>
      <div className="stat-value" style={colorValor ? { color: colorValor } : undefined}>{valor}</div>
      {meta && <div className={`stat-meta ${tono || ''}`}>{meta}</div>}
    </div>
  );
}
