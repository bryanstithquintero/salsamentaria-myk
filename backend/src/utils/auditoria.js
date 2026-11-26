/**
 * Registro de auditoría de operaciones críticas (RF16).
 * Se ejecuta dentro de la misma transacción de la operación auditada.
 */
async function registrarAuditoria(trx, { usuarioId, accion, entidad, entidadId, detalle, ip }) {
  await trx('auditoria').insert({
    usuario_id: usuarioId || null,
    accion,
    entidad,
    entidad_id: entidadId || null,
    detalle: detalle ? JSON.stringify(detalle) : null,
    ip: ip || null,
  });
}

module.exports = { registrarAuditoria };
