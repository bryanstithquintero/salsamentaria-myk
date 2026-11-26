/** Formatos para Colombia: moneda COP sin decimales y fechas en español. */
const moneda = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const numero = new Intl.NumberFormat('es-CO');
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export const fmtMoneda = (n) => moneda.format(Number(n) || 0).replace(/\s/g, ' ');
export const fmtNumero = (n) => numero.format(Number(n) || 0);

/** Fecha local de Colombia en formato AAAA-MM-DD. */
export function hoyISO(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(d);
}

export function sumarDias(fecha, dias) {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** '2026-11-19' → '19 nov' ; si es hoy → 'Hoy' */
export function fmtFechaCorta(fecha, hora) {
  if (!fecha) return '—';
  const f = String(fecha).slice(0, 10);
  const base = f === hoyISO() ? 'Hoy' : `${Number(f.slice(8, 10))} ${MESES[Number(f.slice(5, 7)) - 1]}`;
  return hora ? `${base} · ${hora}` : base;
}

export function fmtFechaLarga(fecha) {
  const f = String(fecha).slice(0, 10);
  const d = new Date(`${f}T12:00:00Z`);
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES_LARGOS[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

/** Días entre hoy y una fecha (negativo si ya pasó). */
export function diasHasta(fecha) {
  if (!fecha) return null;
  return Math.round((new Date(`${String(fecha).slice(0, 10)}T12:00:00Z`) - new Date(`${hoyISO()}T12:00:00Z`)) / 86400000);
}

export const iniciales = (nombre = '') => nombre.split(' ').filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase();

export const MEDIOS_PAGO = { efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta', credito: 'Crédito' };
