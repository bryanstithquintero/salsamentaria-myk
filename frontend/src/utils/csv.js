/**
 * Lectura de CSV para la importación de productos (separador ; o ,).
 * Soporta campos entre comillas y comillas escapadas ("").
 */
export function parsearCsv(texto) {
  const limpio = texto.replace(/^﻿/, '');
  const primera = limpio.split(/\r?\n/, 1)[0] || '';
  const sep = (primera.match(/;/g) || []).length >= (primera.match(/,/g) || []).length ? ';' : ',';
  const filas = [];
  let fila = [];
  let campo = '';
  let comillas = false;
  for (let i = 0; i < limpio.length; i += 1) {
    const c = limpio[i];
    if (comillas) {
      if (c === '"' && limpio[i + 1] === '"') { campo += '"'; i += 1; } else if (c === '"') comillas = false; else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === sep) { fila.push(campo); campo = ''; } else if (c === '\n' || c === '\r') {
      if (c === '\r' && limpio[i + 1] === '\n') i += 1;
      fila.push(campo); filas.push(fila); fila = []; campo = '';
    } else campo += c;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  const [encabezado = [], ...resto] = filas.filter((f) => f.some((x) => x.trim() !== ''));
  const claves = encabezado.map((h) => h.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_'));
  return resto.map((f) => Object.fromEntries(claves.map((k, i) => [k, (f[i] ?? '').trim()])));
}

/** Convierte filas leídas del CSV al formato que espera la API. */
export function filasAProductos(filas) {
  const num = (v) => (v === '' || v === undefined ? undefined : Number(String(v).replace(/[$.\s]/g, '').replace(',', '.')));
  return filas.map((f) => ({
    codigo: f.codigo,
    nombre: f.nombre || f.producto,
    categoria: f.categoria,
    presentacion: f.presentacion || 'Unidad',
    unidad: (f.unidad || 'unidad').toLowerCase(),
    precio_compra: num(f.precio_compra),
    margen: num(f.margen) ?? 30,
    stock_minimo: num(f.stock_minimo) ?? 5,
    stock_inicial: num(f.stock_inicial) ?? 0,
    fecha_vencimiento: f.fecha_vencimiento || undefined,
  }));
}
