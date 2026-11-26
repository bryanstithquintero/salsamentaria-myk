/**
 * Fechas en la zona horaria del negocio (America/Bogota).
 * Las ventas se agrupan por fecha local, no por UTC.
 */
const { TIME_ZONE } = require('../config/env');

const fmtFecha = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
const fmtHora = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: false });

/** Fecha local 'YYYY-MM-DD'. */
function hoy(d = new Date()) {
  return fmtFecha.format(d);
}

/** Hora local 'HH:MM'. */
function horaActual(d = new Date()) {
  return fmtHora.format(d);
}

/** Suma (o resta) días a una fecha 'YYYY-MM-DD'. */
function sumarDias(fecha, dias) {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Lista de fechas consecutivas entre dos fechas (inclusive). */
function rangoFechas(desde, hasta) {
  const out = [];
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) out.push(f);
  return out;
}

module.exports = { hoy, horaActual, sumarDias, rangoFechas };
