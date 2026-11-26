/**
 * Generación de CSV compatible con Excel (separador ; y BOM UTF-8).
 */
function escapar(valor) {
  if (valor === null || valor === undefined) return '';
  const s = String(valor);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function aCsv(columnas, filas) {
  const encabezado = columnas.map((c) => escapar(c.titulo)).join(';');
  const cuerpo = filas.map((f) => columnas.map((c) => escapar(typeof c.valor === 'function' ? c.valor(f) : f[c.valor])).join(';'));
  return '﻿' + [encabezado, ...cuerpo].join('\r\n');
}

module.exports = { aCsv };
