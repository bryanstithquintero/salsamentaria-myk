/**
 * Utilidades de paginación: convierten ?pagina y ?limite en offset/limit
 * y construyen la respuesta estándar { datos, meta }.
 */
function leerPaginacion(query, { limiteMax = 100, limiteDef = 20 } = {}) {
  const pagina = Math.max(1, parseInt(query.pagina, 10) || 1);
  const limite = Math.min(limiteMax, Math.max(1, parseInt(query.limite, 10) || limiteDef));
  return { pagina, limite, offset: (pagina - 1) * limite };
}

function respuestaPaginada(datos, total, { pagina, limite }) {
  return {
    datos,
    meta: { total, pagina, limite, paginas: Math.max(1, Math.ceil(total / limite)) },
  };
}

module.exports = { leerPaginacion, respuestaPaginada };
