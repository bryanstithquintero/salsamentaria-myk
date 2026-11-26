import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useApi from '../hooks/useApi';
import { catalogoApi, productosApi } from '../api/servicios';
import { useToast } from '../context/ToastContext';
import { Campo, Cargando, EncabezadoPagina, ErrorCarga } from '../components/Comunes';
import Icono from '../components/Icono';
import { fmtMoneda, hoyISO } from '../utils/formato';

const VACIO = {
  nombre: '', codigo: '', categoria_id: '', presentacion: '', unidad: 'paquete', stock_inicial: '', fecha_vencimiento: '',
  stock_minimo: '5', proveedor_id: '', precio_compra: '', margen: '30', precio_venta: '', descripcion: '',
};

/** Validación en el cliente (la API vuelve a validar: nunca se confía solo en el navegador). */
function validar(f, esNuevo) {
  const e = {};
  if (f.nombre.trim().length < 3) e.nombre = 'Mínimo 3 caracteres';
  if (!/^[A-Za-z0-9-]{3,20}$/.test(f.codigo.trim())) e.codigo = 'De 3 a 20 caracteres: letras, números y guion';
  if (!f.categoria_id) e.categoria_id = 'Seleccione una categoría';
  if (!f.presentacion.trim()) e.presentacion = 'La presentación es obligatoria';
  if (!(Number(f.precio_compra) > 0)) e.precio_compra = 'Debe ser mayor que cero';
  if (Number(f.margen) < 0) e.margen = 'No puede ser negativo';
  if (f.precio_venta && Number(f.precio_venta) < Number(f.precio_compra)) e.precio_venta = 'No puede ser menor que el precio de compra';
  if (Number(f.stock_minimo) < 0) e.stock_minimo = 'No puede ser negativo';
  if (esNuevo && f.fecha_vencimiento && f.fecha_vencimiento < hoyISO()) e.fecha_vencimiento = 'La fecha ya pasó';
  return e;
}

export default function ProductoForm() {
  const { id } = useParams();
  const esNuevo = !id;
  const navegar = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [precioManual, setPrecioManual] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const categorias = useApi((cfg) => catalogoApi.categorias(cfg), []);
  const proveedores = useApi((cfg) => catalogoApi.proveedores({ limite: 100 }, cfg), []);
  const producto = useApi((cfg) => productosApi.obtener(id, cfg), [id], { inmediato: !esNuevo });

  // Al editar, se cargan los datos del producto en el formulario.
  useEffect(() => {
    const p = producto.datos;
    if (!p) return;
    setForm({
      nombre: p.nombre, codigo: p.codigo, categoria_id: String(p.categoria_id), presentacion: p.presentacion, unidad: p.unidad,
      stock_inicial: '', fecha_vencimiento: '', stock_minimo: String(p.stock_minimo), proveedor_id: p.proveedor_id ? String(p.proveedor_id) : '',
      precio_compra: String(p.precio_compra), margen: String(p.margen), precio_venta: String(p.precio_venta), descripcion: p.descripcion || '',
    });
    setPrecioManual(true);
  }, [producto.datos]);

  // Precio sugerido = compra × (1 + margen), redondeado a la centena (misma regla de la API).
  const precioSugerido = useMemo(() => {
    const c = Number(form.precio_compra);
    const m = Number(form.margen);
    return c > 0 ? Math.round((c * (1 + m / 100)) / 100) * 100 : 0;
  }, [form.precio_compra, form.margen]);
  const precioFinal = precioManual && form.precio_venta ? Number(form.precio_venta) : precioSugerido;
  const ganancia = precioFinal - Number(form.precio_compra || 0);

  const cambiar = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errores[name]) setErrores((er) => ({ ...er, [name]: undefined }));
  };

  const guardar = async (e) => {
    e.preventDefault();
    const er = validar(form, esNuevo);
    setErrores(er);
    if (Object.keys(er).length) {
      toast.error('Revise los campos marcados');
      document.querySelector(`[name="${Object.keys(er)[0]}"]`)?.focus();
      return;
    }
    const cuerpo = {
      nombre: form.nombre.trim(), codigo: form.codigo.trim().toUpperCase(), categoria_id: Number(form.categoria_id),
      proveedor_id: form.proveedor_id ? Number(form.proveedor_id) : null, presentacion: form.presentacion.trim(), unidad: form.unidad,
      precio_compra: Number(form.precio_compra), margen: Number(form.margen), precio_venta: precioFinal,
      stock_minimo: Number(form.stock_minimo || 0), descripcion: form.descripcion.trim() || null,
    };
    if (esNuevo) {
      cuerpo.stock_inicial = Number(form.stock_inicial || 0);
      cuerpo.fecha_vencimiento = form.fecha_vencimiento || null;
    }
    setGuardando(true);
    try {
      const r = esNuevo ? await productosApi.crear(cuerpo) : await productosApi.actualizar(id, cuerpo);
      toast.exito(esNuevo ? `Producto ${r.codigo} creado` : 'Cambios guardados');
      navegar('/productos');
    } catch (err) {
      setErrores(err.porCampo || {});
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (!esNuevo && producto.error) return <ErrorCarga error={producto.error} alReintentar={producto.recargar} />;
  if (!esNuevo && !producto.datos) return <Cargando filas={6} lento={producto.lento} />;

  const titulo = esNuevo ? 'Nuevo producto' : `Editar: ${producto.datos.nombre}`;
  return (
    <form onSubmit={guardar} noValidate>
      <EncabezadoPagina titulo={titulo} subtitulo="Complete los campos. Los marcados con * son obligatorios."
        migas={<nav className="breadcrumb" aria-label="Ruta"><Link to="/productos">Productos</Link><span>›</span><span>{esNuevo ? 'Nuevo producto' : 'Editar'}</span></nav>}>
        <Link to="/productos" className="btn btn-outline">Cancelar</Link>
        <button type="submit" className="btn btn-primary" disabled={guardando}><Icono nombre="guardar" tam={14} grosor={2} /> {guardando ? 'Guardando…' : 'Guardar producto'}</button>
      </EncabezadoPagina>

      <div className="form-wrap">
        <div className="form-section">
          <div className="fs-info">
            <h3>Información básica</h3>
            <p>Nombre visible en el catálogo y código interno para identificar el producto.</p>
            <ul><li>El <abbr title="Stock Keeping Unit: código único del producto">SKU</abbr> debe ser único</li><li>Seleccione la categoría correcta</li></ul>
          </div>
          <div>
            <Campo etiqueta="Nombre del producto *" id="f-nombre" error={errores.nombre}>
              <input className="form-input" id="f-nombre" name="nombre" value={form.nombre} onChange={cambiar} placeholder="Ej: Chorizo Santarrosano" />
            </Campo>
            <div className="form-row form-row-2">
              <Campo etiqueta="Código / SKU *" id="f-codigo" error={errores.codigo}>
                <input className="form-input" id="f-codigo" name="codigo" value={form.codigo} onChange={cambiar} placeholder="Ej: CHO-001" style={{ textTransform: 'uppercase' }} />
              </Campo>
              <Campo etiqueta="Categoría *" id="f-cat" error={errores.categoria_id}>
                <select className="form-select" id="f-cat" name="categoria_id" value={form.categoria_id} onChange={cambiar}>
                  <option value="">— Seleccione —</option>
                  {categorias.datos?.map((c) => <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>)}
                </select>
              </Campo>
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="fs-info"><h3>Presentación</h3><p>Empaque, peso o unidad en que se vende el producto.</p></div>
          <div className="form-row form-row-2">
            <Campo etiqueta="Presentación *" id="f-pres" error={errores.presentacion}>
              <input className="form-input" id="f-pres" name="presentacion" value={form.presentacion} onChange={cambiar} placeholder="Ej: Paquete x 500 g" />
            </Campo>
            <Campo etiqueta="Unidad de medida" id="f-unidad">
              <select className="form-select" id="f-unidad" name="unidad" value={form.unidad} onChange={cambiar}>
                {['paquete', 'unidad', 'libra', 'kilo', 'botella', 'bolsa'].map((u) => <option key={u} value={u}>{u[0].toUpperCase() + u.slice(1)}</option>)}
              </select>
            </Campo>
          </div>
        </div>

        <div className="form-section">
          <div className="fs-info">
            <h3>Inventario</h3>
            <p>{esNuevo ? 'Existencias iniciales: se registran como el primer lote del producto.' : 'Las existencias se modifican desde Inventario (entradas y ajustes por lote).'}</p>
            <ul><li><abbr title="Cantidad mínima antes de generar alerta">Stock mínimo</abbr>: umbral de alerta</li><li>El proveedor es opcional</li></ul>
          </div>
          <div className="form-row form-row-3">
            {esNuevo ? (
              <>
                <Campo etiqueta="Existencias iniciales" id="f-stock" error={errores.stock_inicial}>
                  <input className="form-input" id="f-stock" name="stock_inicial" type="number" min="0" value={form.stock_inicial} onChange={cambiar} placeholder="0" />
                </Campo>
                <Campo etiqueta="Vencimiento del lote" id="f-venc" error={errores.fecha_vencimiento}>
                  <input className="form-input" id="f-venc" name="fecha_vencimiento" type="date" min={hoyISO()} value={form.fecha_vencimiento} onChange={cambiar} />
                </Campo>
              </>
            ) : (
              <Campo etiqueta="Existencias actuales" id="f-actual" ayuda="Se ajustan desde Inventario">
                <input className="form-input" id="f-actual" value={`${producto.datos.stock} ${producto.datos.unidad}`} disabled />
              </Campo>
            )}
            <Campo etiqueta="Stock mínimo" id="f-min" error={errores.stock_minimo}>
              <input className="form-input" id="f-min" name="stock_minimo" type="number" min="0" value={form.stock_minimo} onChange={cambiar} />
            </Campo>
            <Campo etiqueta="Proveedor" id="f-prov">
              <select className="form-select" id="f-prov" name="proveedor_id" value={form.proveedor_id} onChange={cambiar}>
                <option value="">— Sin proveedor —</option>
                {proveedores.datos?.datos.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
              </select>
            </Campo>
          </div>
        </div>

        <div className="form-section">
          <div className="fs-info">
            <h3>Precios</h3>
            <p>El precio de venta se calcula con el <abbr title="Porcentaje de ganancia sobre el precio de compra">margen</abbr> y se redondea a la centena. Puede ingresarlo manualmente.</p>
          </div>
          <div>
            <div className="form-row form-row-3">
              <Campo etiqueta="Precio de compra * ($)" id="f-compra" error={errores.precio_compra}>
                <input className="form-input" id="f-compra" name="precio_compra" type="number" min="0" step="50" value={form.precio_compra} onChange={cambiar} placeholder="4200" />
              </Campo>
              <Campo etiqueta="Margen (%)" id="f-margen" error={errores.margen}>
                <input className="form-input" id="f-margen" name="margen" type="number" min="0" step="0.5" value={form.margen} onChange={(e) => { cambiar(e); setPrecioManual(false); }} />
              </Campo>
              <Campo etiqueta="Precio de venta ($)" id="f-venta" error={errores.precio_venta} ayuda={precioManual ? 'Precio manual' : 'Calculado automáticamente'}>
                <input className="form-input" id="f-venta" name="precio_venta" type="number" min="0" step="50"
                  value={precioManual ? form.precio_venta : precioSugerido || ''} onChange={(e) => { setPrecioManual(true); cambiar(e); }} />
              </Campo>
            </div>
            {precioFinal > 0 && (
              <p className="resumen-precio">Ganancia por unidad: <strong>{fmtMoneda(ganancia)}</strong> · Precio final: <strong>{fmtMoneda(precioFinal)}</strong></p>
            )}
            <Campo etiqueta="Descripción" id="f-desc">
              <textarea className="form-textarea" id="f-desc" name="descripcion" rows={3} maxLength={500} value={form.descripcion} onChange={cambiar} placeholder="Características, conservación, etc." />
            </Campo>
          </div>
        </div>

        <div className="form-actions">
          <Link to="/productos" className="btn btn-outline">Cancelar</Link>
          <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar producto'}</button>
        </div>
      </div>
    </form>
  );
}
