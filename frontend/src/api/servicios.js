/**
 * Funciones de acceso a la API agrupadas por recurso.
 * Los componentes no conocen las URL: solo llaman estas funciones.
 */
import api from './cliente';

const datos = (p) => p.then((r) => r.data);

/** Descarga un archivo (CSV) respetando el nombre que envía el servidor. */
async function descargar(url, params, nombrePorDefecto) {
  const r = await api.get(url, { params, responseType: 'blob' });
  const disposicion = r.headers['content-disposition'] || '';
  const nombre = /filename="?([^"]+)"?/.exec(disposicion)?.[1] || nombrePorDefecto;
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(r.data);
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

export const authApi = {
  login: (usuario, contrasena) => datos(api.post('/auth/login', { usuario, contrasena })),
  perfil: () => datos(api.get('/auth/perfil')),
  cambiarContrasena: (actual, nueva) => datos(api.put('/auth/contrasena', { actual, nueva })),
};

export const dashboardApi = {
  resumen: (config) => datos(api.get('/dashboard/resumen', config)),
  ventas: (periodo, config) => datos(api.get('/dashboard/ventas', { ...config, params: { periodo } })),
};

export const productosApi = {
  listar: (params, config) => datos(api.get('/productos', { ...config, params })),
  obtener: (id, config) => datos(api.get(`/productos/${id}`, config)),
  crear: (p) => datos(api.post('/productos', p)),
  actualizar: (id, p) => datos(api.put(`/productos/${id}`, p)),
  desactivar: (id) => datos(api.delete(`/productos/${id}`)),
  importar: (productos) => datos(api.post('/productos/importar', { productos })),
  exportar: (params) => descargar('/productos/exportar', params, 'inventario-myk.csv'),
};

export const catalogoApi = {
  categorias: (config) => datos(api.get('/categorias', config)),
  proveedores: (params, config) => datos(api.get('/proveedores', { ...config, params })),
  proveedor: (id, config) => datos(api.get(`/proveedores/${id}`, config)),
  crearProveedor: (p) => datos(api.post('/proveedores', p)),
  actualizarProveedor: (id, p) => datos(api.put(`/proveedores/${id}`, p)),
};

export const inventarioApi = {
  alertas: (dias, config) => datos(api.get('/inventario/alertas', { ...config, params: { dias } })),
  lotes: (params, config) => datos(api.get('/inventario/lotes', { ...config, params })),
  movimientos: (params, config) => datos(api.get('/inventario/movimientos', { ...config, params })),
  entrada: (e) => datos(api.post('/inventario/entradas', e)),
  ajuste: (a) => datos(api.post('/inventario/ajustes', a)),
};

export const ventasApi = {
  listar: (params, config) => datos(api.get('/ventas', { ...config, params })),
  obtener: (id, config) => datos(api.get(`/ventas/${id}`, config)),
  crear: (v) => datos(api.post('/ventas', v)),
  anular: (id, motivo) => datos(api.patch(`/ventas/${id}/anular`, { motivo })),
  abonar: (id, valor, medio_pago) => datos(api.post(`/ventas/${id}/abonos`, { valor, medio_pago })),
};

export const clientesApi = {
  listar: (params, config) => datos(api.get('/clientes', { ...config, params })),
  obtener: (id, config) => datos(api.get(`/clientes/${id}`, config)),
  crear: (c) => datos(api.post('/clientes', c)),
  actualizar: (id, c) => datos(api.put(`/clientes/${id}`, c)),
  desactivar: (id) => datos(api.delete(`/clientes/${id}`)),
};

export const reportesApi = {
  ventas: (params, config) => datos(api.get('/reportes/ventas', { ...config, params })),
  exportarVentas: (params) => descargar('/reportes/ventas', { ...params, formato: 'csv' }, 'ventas.csv'),
};

export const usuariosApi = {
  listar: (config) => datos(api.get('/usuarios', config)),
  crear: (u) => datos(api.post('/usuarios', u)),
  actualizar: (id, u) => datos(api.put(`/usuarios/${id}`, u)),
  restablecer: (id, contrasena) => datos(api.patch(`/usuarios/${id}/contrasena`, { contrasena })),
};

export const auditoriaApi = {
  listar: (params, config) => datos(api.get('/auditoria', { ...config, params })),
};
